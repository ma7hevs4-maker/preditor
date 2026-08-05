import React, { useState, useMemo } from "react";
import { CloudSun, CloudRain, Wind, Thermometer, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Database, Clock, Droplets, Info, Map as MapIcon, LayoutGrid, Users } from "lucide-react";
import { useBases, Base } from "@/hooks/useBases";
import { useWeather, WeatherHour } from "@/hooks/useWeather";
import { useWeatherProvider } from "@/hooks/useWeatherProvider";
import { useWeatherTriggers, isTriggerActive, WeatherTrigger } from "@/hooks/useWeatherTriggers";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { REGIONAIS, Regional } from "@/data/basesConfig";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WeatherHourDetailDialog } from "@/components/clima/WeatherHourDetailDialog";
import { translateWeatherDescription } from "@/utils/weatherTranslations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DailyTeamPlan, planToTeamsArray, planToLossTeamsArray } from "@/hooks/useDailyTeamPlans";
import { useTeamTypeEntriesByPlans, TeamTypeEntry } from "@/hooks/useTeamTypeEntries";
import { TURNOS } from "@/data/teamTypes";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const UTN_REGIONAIS = ["Campos", "Macaé", "Lagos", "Noroeste"];
const UTS_REGIONAIS = ["Magé", "Niterói", "São Gonçalo", "Serrana", "Sul"];

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  openmeteo: { label: "Open-Meteo", color: "text-primary" },
  openweathermap: { label: "OpenWeatherMap", color: "text-orange-400" },
};

const GERAIS_TYPES = ["Emergência", "Gestores", "Poda", "Cesto Manutenção", "Cesto Obras"] as const;
const LV_MK_TYPES = ["LV Manutenção", "LV Obras", "MK Manutenção", "MK Obras", "Reguladas"] as const;
const APOIO_TYPES = ["Apoio UTS", "Apoio UTN"] as const;
const BT_ONLY_TYPES = ["Corte e Religa", "Perdas"] as const;
const ALL_DISPLAY_TYPES = [...GERAIS_TYPES, ...LV_MK_TYPES, ...APOIO_TYPES, ...BT_ONLY_TYPES] as const;
const ALL_INCIDENTS_TYPES = [...GERAIS_TYPES, ...APOIO_TYPES] as const;

const TURNO_COLORS = {
  A: {
    bg: "bg-blue-500/10", border: "border-blue-500/30",
    header: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    cell: "text-blue-600 dark:text-blue-300",
    avgCell: "bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold",
    avgHeader: "bg-blue-500/25 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300 font-bold",
  },
  B: {
    bg: "bg-amber-500/10", border: "border-amber-500/30",
    header: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    cell: "text-amber-600 dark:text-amber-300",
    avgCell: "bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold",
    avgHeader: "bg-amber-500/25 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold",
  },
  C: {
    bg: "bg-purple-500/10", border: "border-purple-500/30",
    header: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    cell: "text-purple-600 dark:text-purple-300",
    avgCell: "bg-purple-500/15 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold",
    avgHeader: "bg-purple-500/25 dark:bg-purple-500/30 text-purple-700 dark:text-purple-300 font-bold",
  },
} as const;

function avgArr(arr: number[], hours: readonly number[]): number {
  if (hours.length === 0) return 0;
  const sum = hours.reduce((s, h) => s + arr[h], 0);
  return Math.round(sum / hours.length);
}

function sumTurnoAverages(arr: number[]): number {
  return TURNOS.reduce((sum, turno) => sum + avgArr(arr, turno.hours), 0);
}

function getRainLevel(mm: number) {
  if (mm >= 10) return { label: "Muito Forte", cls: "text-destructive bg-destructive/10" };
  if (mm >= 6) return { label: "Forte", cls: "text-warning bg-warning/10" };
  if (mm >= 3) return { label: "Moderada", cls: "text-primary bg-primary/10" };
  if (mm >= 0.2) return { label: "Fraca", cls: "text-blue-400 bg-blue-400/10" };
  return { label: "Seco", cls: "text-muted-foreground bg-muted/30" };
}

function getWindLevel(kmh: number) {
  if (kmh >= 36) return { label: "Muito Forte", cls: "text-destructive" };
  if (kmh >= 22) return { label: "Forte", cls: "text-warning" };
  if (kmh >= 14) return { label: "Moderado", cls: "text-primary" };
  return { label: "Leve", cls: "text-muted-foreground" };
}

function getTriggerNameColor(trigger: WeatherTrigger) {
  const name = trigger.name.toLowerCase();
  if (name.includes("muito forte")) return "text-destructive";
  if (name.includes("forte")) return "text-warning";
  if (name.includes("moderada") || name.includes("moderado")) return "text-orange-500 dark:text-orange-400";
  if (name.includes("fraca") || name.includes("leve")) return "text-blue-500 dark:text-blue-400";
  if (name.includes("frio")) return "text-cyan-500 dark:text-cyan-400";
  return "text-warning";
}

// Hook to fetch all plans for a date
const useAllPlansForDate = (date: string) =>
  useQuery({
    queryKey: ["all_daily_plans_date_clima", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_team_plans")
        .select("*")
        .eq("plan_date", date);
      if (error) throw error;
      return data as DailyTeamPlan[];
    },
    enabled: !!date,
  });

// ---------- Structure Detail Dialog (consolidated first, then hour-by-hour) ----------
interface StructureDetailDialogProps {
  open: boolean;
  onClose: () => void;
  regional: Regional;
  allBases: { id: string; name: string }[];
  plans: DailyTeamPlan[];
  allTypeEntries: TeamTypeEntry[];
  selectedDate: Date;
}

const StructureDetailDialog = ({ open, onClose, regional, allBases, plans, allTypeEntries, selectedDate }: StructureDetailDialogProps) => {
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");
  const [showHourly, setShowHourly] = useState(false);
  const hasSucursais = regional.sucursais.length > 0;

  const regionalBaseIds = useMemo(() => {
    if (!hasSucursais) {
      const base = allBases.find(b => b.name.toLowerCase() === regional.label.toLowerCase());
      return base ? [base.id] : [];
    }
    return regional.sucursais
      .map(s => allBases.find(b => b.name.toLowerCase() === s.name.toLowerCase()))
      .filter(Boolean)
      .map(b => b!.id);
  }, [regional, allBases, hasSucursais]);

  const regionalPlans = useMemo(() => plans.filter(p => regionalBaseIds.includes(p.base_id)), [plans, regionalBaseIds]);

  const filteredPlans = useMemo(() => {
    if (selectedSucursal === "todas" || !hasSucursais) return regionalPlans;
    const sucursalBase = allBases.find(b => b.name.toLowerCase() === selectedSucursal.toLowerCase());
    if (!sucursalBase) return [];
    return regionalPlans.filter(p => p.base_id === sucursalBase.id);
  }, [regionalPlans, selectedSucursal, hasSucursais, allBases]);

  const filteredPlanIds = filteredPlans.map(p => p.id);
  const filteredEntries = useMemo(() => allTypeEntries.filter(e => filteredPlanIds.includes(e.daily_plan_id)), [allTypeEntries, filteredPlanIds]);

  const typePerHour = useMemo((): Record<string, number[]> => {
    const map: Record<string, number[]> = {};
    ALL_DISPLAY_TYPES.forEach(type => { map[type] = Array(24).fill(0); });
    filteredEntries.forEach(e => { if (map[e.team_type]) map[e.team_type][e.hour] += e.quantity; });
    return map;
  }, [filteredEntries]);

  // Excluded types for totals
  const EXCLUDED_TYPES: readonly string[] = [...LV_MK_TYPES];

  // Per-type sum of turno averages
  const typeAvgSum = useMemo(() => {
    const result: Record<string, number> = {};
    ALL_DISPLAY_TYPES.forEach(type => {
      const arr = typePerHour[type] || Array(24).fill(0);
      result[type] = TURNOS.reduce((sum, turno) => sum + avgArr(arr, turno.hours), 0);
    });
    return result;
  }, [typePerHour]);

  // Turno totals (excluding LV/MK/Reguladas)
  const turnoTotals = useMemo(() => {
    return TURNOS.map(turno => {
      let total = 0;
      ALL_DISPLAY_TYPES.forEach(type => {
        if (!EXCLUDED_TYPES.includes(type)) {
          total += avgArr(typePerHour[type] || [], turno.hours);
        }
      });
      return total;
    });
  }, [typePerHour]);
  const declaredTeamsTotal = turnoTotals.reduce((sum, total) => sum + total, 0);

  // 24h totals
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const countedPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    ALL_DISPLAY_TYPES.forEach(type => {
      if (!EXCLUDED_TYPES.includes(type)) {
        (typePerHour[type] || []).forEach((v, h) => { arr[h] += v; });
      }
    });
    return arr;
  }, [typePerHour]);

  const mtPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    const MT_TYPES = [...GERAIS_TYPES, ...APOIO_TYPES] as readonly string[];
    filteredEntries.forEach(e => {
      if (MT_TYPES.includes(e.team_type)) arr[e.hour] += e.quantity;
    });
    return arr;
  }, [filteredEntries]);

  const btPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    filteredEntries.forEach(e => {
      if ((BT_ONLY_TYPES as readonly string[]).includes(e.team_type)) arr[e.hour] += e.quantity;
    });
    return arr;
  }, [filteredEntries]);

  const avgTotal = avgArr(countedPerHour, allHours);
  const avgMT = avgArr(mtPerHour, allHours);
  const avgBT = avgArr(btPerHour, allHours);

  const sucursalOptions = hasSucursais ? regional.sucursais.map(s => s.name) : [];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setShowHourly(false); } }}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", showHourly ? "max-w-[98vw] w-full" : "max-w-md")}>
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2">
              {showHourly && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHourly(false)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              Estrutura Declarada - {regional.label}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">{declaredTeamsTotal} equipes</Badge>
              {hasSucursais && (
                <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                  <SelectTrigger className="w-[180px] h-8 text-sm">
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as sucursais</SelectItem>
                    {sucursalOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </DialogHeader>

        {filteredPlans.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Nenhum plano encontrado para esta seleção.
          </div>
        ) : showHourly ? (
          /* ===== HOURLY VIEW ===== */
          <>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium min-w-[120px] sticky left-0 bg-background z-10">Tipo</th>
                    {TURNOS.map(turno => {
                      const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                      return (
                        <React.Fragment key={`th-${turno.letter}`}>
                          <th colSpan={turno.hours.length + 1} className={cn("text-center py-1 px-1 font-semibold text-xs rounded-t border-b", colors.header)}>
                            {turno.label}
                          </th>
                          {turno.letter !== "C" && <th className="w-2" />}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                  <tr>
                    <th className="sticky left-0 bg-background z-10" />
                    {TURNOS.map(turno => {
                      const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                      return (
                        <React.Fragment key={`hr-${turno.letter}`}>
                          {turno.hours.map(h => (
                            <th key={h} className={cn("text-center py-1 px-0.5 font-mono font-medium min-w-[24px]", colors.cell)}>
                              {String(h).padStart(2, "0")}
                            </th>
                          ))}
                          <th className={cn("text-center py-1 px-1 font-medium min-w-[32px] rounded-sm", colors.avgHeader)}>x̄</th>
                          {turno.letter !== "C" && <th className="w-2" />}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {([
                    { types: [...GERAIS_TYPES] as string[], labelCls: "text-muted-foreground", valCls: "text-foreground" },
                  ]).map(({ types, labelCls, valCls }) =>
                    types.map((type, idx) => {
                      const row = typePerHour[type] || [];
                      const hasAny = TURNOS.some(t => t.hours.some(h => (row[h] || 0) > 0));
                      if (!hasAny) return null;
                      return (
                        <tr key={type} className={cn("hover:bg-muted/20", idx === 0 && "border-t border-border/30")}>
                          <td className={cn("py-0.5 pr-2 sticky left-0 bg-background z-10", labelCls)}>{type}</td>
                          {TURNOS.map(turno => {
                            const tc = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                            return (
                              <React.Fragment key={turno.letter}>
                                {turno.hours.map(h => (
                                  <td key={h} className={cn("text-center py-0.5 font-mono", valCls)}>{row[h] || 0}</td>
                                ))}
                                <td className={cn("text-center py-0.5 font-mono rounded-sm", tc.avgCell)}>{avgArr(row, turno.hours)}</td>
                                {turno.letter !== "C" && <td className="w-2" />}
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                  <tr><td colSpan={100}><div className="border-t border-border/20 my-1" /></td></tr>
                  {LV_MK_TYPES.map(type => {
                    const row = typePerHour[type] || [];
                    const hasAny = TURNOS.some(t => t.hours.some(h => (row[h] || 0) > 0));
                    if (!hasAny) return null;
                    return (
                      <tr key={type} className="hover:bg-muted/20">
                        <td className="py-0.5 text-muted-foreground/60 pr-2 sticky left-0 bg-background z-10">{type}</td>
                        {TURNOS.map(turno => {
                          const tc = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                          return (
                            <React.Fragment key={turno.letter}>
                              {turno.hours.map(h => (
                                <td key={h} className="text-center py-0.5 font-mono text-muted-foreground/60">{row[h] || 0}</td>
                              ))}
                              <td className={cn("text-center py-0.5 font-mono rounded-sm opacity-60", tc.avgCell)}>{avgArr(row, turno.hours)}</td>
                              {turno.letter !== "C" && <td className="w-2" />}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr><td colSpan={100}><div className="border-t border-border/20 my-1" /></td></tr>
                  {APOIO_TYPES.map(type => {
                    const row = typePerHour[type] || [];
                    const hasAny = TURNOS.some(t => t.hours.some(h => (row[h] || 0) > 0));
                    if (!hasAny) return null;
                    return (
                      <tr key={type} className="hover:bg-muted/20">
                        <td className="py-0.5 text-muted-foreground pr-2 sticky left-0 bg-background z-10">{type}</td>
                        {TURNOS.map(turno => {
                          const tc = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                          return (
                            <React.Fragment key={turno.letter}>
                              {turno.hours.map(h => (
                                <td key={h} className="text-center py-0.5 font-mono text-foreground">{row[h] || 0}</td>
                              ))}
                              <td className={cn("text-center py-0.5 font-mono rounded-sm", tc.avgCell)}>{avgArr(row, turno.hours)}</td>
                              {turno.letter !== "C" && <td className="w-2" />}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr><td colSpan={100}><div className="border-t border-border/20 my-1" /></td></tr>
                  {BT_ONLY_TYPES.map(type => {
                    const row = typePerHour[type] || [];
                    const hasAny = TURNOS.some(t => t.hours.some(h => (row[h] || 0) > 0));
                    if (!hasAny) return null;
                    return (
                      <tr key={type} className="hover:bg-muted/20">
                        <td className="py-0.5 text-warning pr-2 sticky left-0 bg-background z-10">{type}</td>
                        {TURNOS.map(turno => {
                          const tc = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                          return (
                            <React.Fragment key={turno.letter}>
                              {turno.hours.map(h => (
                                <td key={h} className="text-center py-0.5 font-mono text-warning/80">{row[h] || 0}</td>
                              ))}
                              <td className={cn("text-center py-0.5 font-mono rounded-sm", tc.avgCell, "text-warning")}>{avgArr(row, turno.hours)}</td>
                              {turno.letter !== "C" && <td className="w-2" />}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-6 mt-3 pt-3 border-t border-border/30 flex-wrap">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">Eq. Totais (24h)</span>
                <span className="font-bold text-sm text-foreground">{avgTotal}</span>
              </div>
              <div className="w-px bg-border/50 self-stretch" />
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">Eq. MT (24h)</span>
                <span className="font-bold text-sm text-foreground">{avgMT}</span>
              </div>
              <div className="w-px bg-border/50 self-stretch" />
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">Eq. BT (24h)</span>
                <span className="font-bold text-sm text-warning">{avgBT}</span>
              </div>
            </div>
          </>
        ) : (
          /* ===== CONSOLIDATED VIEW ===== */
          <div className="space-y-4">
            {/* Turno squares */}
            <div className="grid grid-cols-3 gap-3">
              {TURNOS.map((turno, idx) => {
                const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                return (
                  <div key={turno.letter} className={cn("rounded-lg p-3 text-center border", colors.bg, colors.border)}>
                    <div className={cn("text-xs font-semibold mb-1", colors.cell)}>{turno.letter}</div>
                    <div className={cn("text-2xl font-bold", colors.cell)}>{turnoTotals[idx]}</div>
                  </div>
                );
              })}
            </div>

            {/* Type list */}
            <div className="border-t border-border/30 pt-3 space-y-1">
              {GERAIS_TYPES.map(type => {
                const val = typeAvgSum[type] || 0;
                if (val === 0) return null;
                return (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-semibold text-foreground">{val}</span>
                  </div>
                );
              })}
              {LV_MK_TYPES.map(type => {
                const val = typeAvgSum[type] || 0;
                if (val === 0) return null;
                return (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-semibold text-muted-foreground/60">{val}</span>
                  </div>
                );
              })}
              {APOIO_TYPES.map(type => {
                const val = typeAvgSum[type] || 0;
                if (val === 0) return null;
                return (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-semibold text-foreground">{val}</span>
                  </div>
                );
              })}
              {BT_ONLY_TYPES.map(type => {
                const val = typeAvgSum[type] || 0;
                if (val === 0) return null;
                return (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-semibold text-warning">{val}</span>
                  </div>
                );
              })}
            </div>

            {/* Footer totals */}
            <div className="border-t border-border/30 pt-3 flex justify-between text-xs">
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground">Eq. Totais (24h)</span>
                <span className="font-bold text-lg text-foreground">{avgTotal}</span>
              </div>
              <div className="w-px bg-border/50" />
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground">Eq. MT (24h)</span>
                <span className="font-bold text-lg text-foreground">{avgMT}</span>
              </div>
              <div className="w-px bg-border/50" />
              <div className="flex flex-col items-center">
                <span className="text-muted-foreground">Eq. BT (24h)</span>
                <span className="font-bold text-lg text-warning">{avgBT}</span>
              </div>
            </div>

            {/* Button to see hourly */}
            <Button variant="outline" className="w-full" onClick={() => setShowHourly(true)}>
              <Clock className="w-4 h-4 mr-2" />
              Ver detalhamento hora a hora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------- Hourly detail dialog for a base ----------
function BaseDetailDialog({ open, onOpenChange, base, dayHours, triggers, selectedDay, provider }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  base: Base;
  dayHours: WeatherHour[];
  triggers: WeatherTrigger[];
  selectedDay: Date;
  provider: string;
}) {
  const providerInfo = PROVIDER_LABELS[provider] || PROVIDER_LABELS.openmeteo;
  const [selectedHour, setSelectedHour] = useState<WeatherHour | null>(null);
  const { data: historicalData } = useHistoricalData(base.id);

  const hourTriggerMap = useMemo(() => {
    const map = new Map<number, WeatherTrigger[]>();
    dayHours.forEach(h => {
      const active = triggers.filter(t => isTriggerActive(t, h.precip_mm, h.wind_kmh, h.temp_c, h.gust_kmh));
      map.set(h.hour, active);
    });
    return map;
  }, [dayHours, triggers]);

  const triggerRanges = useMemo(() => {
    const triggerMap = new Map<string, { trigger: WeatherTrigger; hours: number[] }>();
    dayHours.forEach(h => {
      const active = hourTriggerMap.get(h.hour) || [];
      active.forEach(t => {
        const existing = triggerMap.get(t.id);
        if (existing) existing.hours.push(h.hour);
        else triggerMap.set(t.id, { trigger: t, hours: [h.hour] });
      });
    });

    return Array.from(triggerMap.values()).map(({ trigger, hours }) => {
      const ranges: string[] = [];
      let start = hours[0], end = hours[0];
      for (let i = 1; i < hours.length; i++) {
        if (hours[i] === end + 1) { end = hours[i]; }
        else { ranges.push(start === end ? `${start}h` : `${start}h–${end}h`); start = end = hours[i]; }
      }
      ranges.push(start === end ? `${start}h` : `${start}h–${end}h`);
      return { trigger, hours: hours.length, ranges: ranges.join(", ") };
    });
  }, [dayHours, hourTriggerMap]);

  const selectedHourHistorical = useMemo(() => {
    if (!selectedHour || !historicalData) return null;
    return historicalData.find(d => d.hour === selectedHour.hour) || null;
  }, [selectedHour, historicalData]);

  const selectedHourTriggers = useMemo(() => {
    if (!selectedHour) return [];
    return hourTriggerMap.get(selectedHour.hour) || [];
  }, [selectedHour, hourTriggerMap]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-primary" />
                  {base.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })} · Coordenadas: {base.lat.toFixed(4)}, {base.lon.toFixed(4)}
                </p>
              </div>
              <Badge variant="outline" className={cn("text-[10px] gap-1", providerInfo.color)}>
                <Database className="w-3 h-3" />
                {providerInfo.label}
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-4">
              {triggerRanges.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-sm font-semibold text-foreground">Gatilhos previstos para este dia</span>
                  </div>
                  {triggerRanges.map(({ trigger, hours, ranges }) => (
                    <div key={trigger.id} className="flex items-center justify-between text-xs bg-warning/10 rounded px-3 py-2">
                      <div>
                        <span className={cn("font-semibold", getTriggerNameColor(trigger))}>{trigger.name}</span>
                        {trigger.description && (
                          <span className="text-muted-foreground ml-1">— {trigger.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground whitespace-nowrap">
                        <span className="font-mono text-foreground font-semibold">{hours}h total</span>
                        <span className="text-[10px]">{ranges}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                  <table className="min-w-[600px] w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-muted/30 z-10">Hora</th>
                        <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Condição</th>
                        <th className="text-right px-2 py-2 font-semibold text-muted-foreground">
                          <div className="flex items-center justify-end gap-1"><Thermometer className="w-3 h-3" />Temp</div>
                        </th>
                        <th className="text-right px-2 py-2 font-semibold text-muted-foreground">
                          <div className="flex items-center justify-end gap-1"><CloudRain className="w-3 h-3" />Chuva</div>
                        </th>
                        <th className="text-right px-2 py-2 font-semibold text-muted-foreground">
                          <div className="flex items-center justify-end gap-1"><Droplets className="w-3 h-3" />Umid.</div>
                        </th>
                        <th className="text-right px-2 py-2 font-semibold text-muted-foreground">
                          <div className="flex items-center justify-end gap-1"><Wind className="w-3 h-3" />Vento</div>
                        </th>
                        <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Rajada</th>
                        <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Gatilhos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayHours.map((h, i) => {
                        const rainLvl = getRainLevel(h.precip_mm);
                        const windLvl = getWindLevel(h.wind_kmh);
                        const activeTriggers = hourTriggerMap.get(h.hour) || [];
                        const hasTrigg = activeTriggers.length > 0;

                        return (
                          <tr
                            key={i}
                            onClick={() => setSelectedHour(h)}
                            className={cn(
                              "border-b border-border/50 transition-colors cursor-pointer",
                              hasTrigg ? "bg-warning/5 hover:bg-warning/10" : "hover:bg-muted/30"
                            )}
                          >
                            <td className="px-3 py-2 font-mono font-semibold text-foreground sticky left-0 bg-card/80 z-10">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                {String(h.hour).padStart(2, "0")}:00
                              </div>
                            </td>
                            <td className="text-center px-2 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <img
                                  src={`https://openweathermap.org/img/wn/${h.icon}.png`}
                                  alt={h.description}
                                  className="w-6 h-6"
                                />
                                <span className="text-[10px] text-muted-foreground capitalize truncate max-w-[80px]">
                                  {translateWeatherDescription(h.description)}
                                </span>
                              </div>
                            </td>
                            <td className="text-right px-2 py-2 font-mono text-foreground">{h.temp_c.toFixed(1)}°</td>
                            <td className="text-right px-2 py-2">
                              <span className={cn("font-mono px-1.5 py-0.5 rounded text-[10px] font-semibold", rainLvl.cls)}>
                                {h.precip_mm.toFixed(1)} mm
                              </span>
                            </td>
                            <td className="text-right px-2 py-2 font-mono text-muted-foreground">{h.humidity}%</td>
                            <td className={cn("text-right px-2 py-2 font-mono", windLvl.cls)}>{h.wind_kmh.toFixed(0)} km/h</td>
                            <td className="text-right px-2 py-2 font-mono text-muted-foreground">{h.gust_kmh?.toFixed(0) ?? "—"}</td>
                            <td className="text-center px-2 py-2">
                              {hasTrigg ? (
                                <div className="flex flex-wrap justify-center gap-0.5">
                                  {activeTriggers.map(t => (
                                    <span key={t.id} className="inline-block w-2 h-2 rounded-full bg-warning" title={t.name} />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground px-1">
                <div className="flex items-center gap-1"><Info className="w-3 h-3" /> Legenda chuva:</div>
                <span className="px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">Fraca (0.2-3mm)</span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">Moderada (3-6mm)</span>
                <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning">Forte (6-10mm)</span>
                <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Muito Forte (&gt;10mm)</span>
                <span className="ml-auto text-[9px] italic">Clique em um horário para mais detalhes</span>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <WeatherHourDetailDialog
        open={!!selectedHour}
        onOpenChange={(open) => { if (!open) setSelectedHour(null); }}
        hour={selectedHour}
        activeTriggers={selectedHourTriggers}
        historicalData={selectedHourHistorical}
        baseName={base.name}
      />
    </>
  );
}

// ---------- Weather card for a single base ----------
function BaseWeatherCard({ base, provider, selectedDay, eqhTotal, eqhSucursal, showSucursal, onOpenStructure }: {
  base: Base;
  provider: "openmeteo" | "openweathermap";
  selectedDay: Date;
  eqhTotal: number | null;
  eqhSucursal?: number | null;
  showSucursal?: boolean;
  onOpenStructure?: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { data, isLoading } = useWeather(base.lat, base.lon, 168, provider, "day");
  const { data: triggers } = useWeatherTriggers(base.id);
  const { data: historicalData } = useHistoricalData(base.id);

  const dayHours = useMemo(() => {
    if (!data?.forecast) return [];
    const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
    return data.forecast.filter((h) => h.datetime.slice(0, 10) === selectedDayKey);
  }, [data?.forecast, selectedDay]);

  const triggerAnalysis = useMemo(() => {
    if (!triggers || dayHours.length === 0) return { activeTriggers: [], maxConsecutive: 0, totalActiveHours: 0 };

    const hourTriggers = dayHours.map(h => {
      const active = triggers.filter(t => isTriggerActive(t, h.precip_mm, h.wind_kmh, h.temp_c, h.gust_kmh));
      return { hour: h, activeTriggers: active };
    });

    let totalActiveHours = 0;
    hourTriggers.forEach(ht => { if (ht.activeTriggers.length > 0) totalActiveHours++; });

    let maxConsecutive = 0, current = 0;
    hourTriggers.forEach(ht => {
      if (ht.activeTriggers.length > 0) { current++; maxConsecutive = Math.max(maxConsecutive, current); }
      else { current = 0; }
    });

    const triggerHourMap = new Map<string, { trigger: WeatherTrigger; hours: number }>();
    hourTriggers.forEach(ht => {
      ht.activeTriggers.forEach(t => {
        const existing = triggerHourMap.get(t.id);
        if (existing) existing.hours++;
        else triggerHourMap.set(t.id, { trigger: t, hours: 1 });
      });
    });

    return { activeTriggers: Array.from(triggerHourMap.values()), maxConsecutive, totalActiveHours };
  }, [triggers, dayHours]);

  const summary = useMemo(() => {
    if (dayHours.length === 0) return null;
    const maxPrecip = Math.max(...dayHours.map(h => h.precip_mm));
    const totalPrecip = dayHours.reduce((s, h) => s + h.precip_mm, 0);
    const maxWind = Math.max(...dayHours.map(h => h.wind_kmh));
    const maxGust = Math.max(...dayHours.map(h => h.gust_kmh ?? 0));
    const minTemp = Math.min(...dayHours.map(h => h.temp_c));
    const maxTemp = Math.max(...dayHours.map(h => h.temp_c));
    const rainHours = dayHours.filter(h => h.precip_mm >= 0.2).length;
    return { maxPrecip, totalPrecip, maxWind, maxGust, minTemp, maxTemp, rainHours };
  }, [dayHours]);

  const operationalSummary = useMemo(() => {
    if (!historicalData || historicalData.length === 0 || dayHours.length === 0 || !triggers) return null;

    let totalBtEntry = 0, totalMtEntry = 0;
    let totalBtEntryAdj = 0, totalMtEntryAdj = 0;
    let totalBtOpRemoval = 0, totalMtOpRemoval = 0;
    let totalBtOpRemovalAdj = 0, totalMtOpRemovalAdj = 0;

    dayHours.forEach(h => {
      const hist = historicalData.find(d => d.hour === h.hour);
      if (!hist) return;

      const activeTriggers = triggers.filter(t => isTriggerActive(t, h.precip_mm, h.wind_kmh, h.temp_c, h.gust_kmh));
      let upliftBT = 0, upliftMT = 0;
      activeTriggers.forEach(t => {
        upliftBT += (t.impact_percent_bt ?? t.impact_percent ?? 0);
        upliftMT += (t.impact_percent_mt ?? t.impact_percent ?? 0);
      });

      const btEntry = hist.bt_entry_rate;
      const mtEntry = hist.mt_entry_rate;
      const btEntryAdj = btEntry * (1 + upliftBT / 100);
      const mtEntryAdj = mtEntry * (1 + upliftMT / 100);

      totalBtEntry += btEntry;
      totalMtEntry += mtEntry;
      totalBtEntryAdj += btEntryAdj;
      totalMtEntryAdj += mtEntryAdj;

      totalBtOpRemoval += btEntry * hist.bt_operator_removal;
      totalMtOpRemoval += mtEntry * hist.mt_operator_removal;
      totalBtOpRemovalAdj += btEntryAdj * hist.bt_operator_removal;
      totalMtOpRemovalAdj += mtEntryAdj * hist.mt_operator_removal;
    });

    const hasUplift = totalBtEntryAdj !== totalBtEntry || totalMtEntryAdj !== totalMtEntry;

    const btEntryForTeam = totalBtEntry - totalBtOpRemoval;
    const mtEntryForTeam = totalMtEntry - totalMtOpRemoval;
    const btEntryForTeamAdj = totalBtEntryAdj - totalBtOpRemovalAdj;
    const mtEntryForTeamAdj = totalMtEntryAdj - totalMtOpRemovalAdj;

    const teamsNeeded = Math.ceil(btEntryForTeam / 3 + mtEntryForTeam / 1.5);
    const teamsNeededAdj = Math.ceil(btEntryForTeamAdj / 3 + mtEntryForTeamAdj / 1.5);

    return {
      totalBtEntry, totalMtEntry,
      totalBtEntryAdj, totalMtEntryAdj,
      totalBtOpRemoval, totalMtOpRemoval,
      totalBtOpRemovalAdj, totalMtOpRemovalAdj,
      btEntryForTeam, mtEntryForTeam,
      btEntryForTeamAdj, mtEntryForTeamAdj,
      teamsNeeded, teamsNeededAdj,
      hasUplift,
    };
  }, [historicalData, dayHours, triggers]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <h4 className="text-sm font-semibold text-foreground">{base.name}</h4>
        <p className="text-xs text-muted-foreground mt-2">Sem dados disponíveis</p>
      </div>
    );
  }

  const hasActiveTriggers = triggerAnalysis.totalActiveHours > 0;
  const rainLvl = getRainLevel(summary.maxPrecip);

  return (
    <>
      <div
        onClick={() => setDetailOpen(true)}
        className="glass-card p-4 transition-all cursor-pointer hover:ring-2 hover:ring-primary/30 group"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{base.name}</h4>
          <div className="flex items-center gap-1.5">
            {hasActiveTriggers && (
              <Badge variant="outline" className="text-xs border-warning/50 text-warning bg-warning/10 px-1.5 py-0">
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                {triggerAnalysis.totalActiveHours}h
              </Badge>
            )}
            {summary.rainHours > 0 && (
              <Badge variant="outline" className={cn("text-xs px-1.5 py-0", rainLvl.cls)}>
                <CloudRain className="w-3 h-3 mr-0.5" />
                {summary.rainHours}h
              </Badge>
            )}
          </div>
        </div>

        {/* Main metrics row */}
        <div className="grid grid-cols-3 gap-1 mb-2.5">
          <div className="text-center p-1.5 rounded bg-muted/20">
            <CloudRain className="w-4 h-4 text-blue-400 mx-auto mb-0.5" />
            <p className="text-xs text-muted-foreground">Chuva</p>
            <p className="text-sm font-mono font-bold text-foreground">{summary.totalPrecip.toFixed(1)}<span className="text-xs text-muted-foreground">mm</span></p>
          </div>
          <div className="text-center p-1.5 rounded bg-muted/20">
            <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-0.5" />
            <p className="text-xs text-muted-foreground">Vento</p>
            <p className="text-sm font-mono font-bold text-foreground">{summary.maxWind.toFixed(0)}<span className="text-xs text-muted-foreground">km/h</span></p>
          </div>
          <div className="text-center p-1.5 rounded bg-muted/20">
            <Thermometer className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
            <p className="text-xs text-muted-foreground">Temp</p>
            <p className="text-sm font-mono font-bold text-foreground">{summary.minTemp.toFixed(0)}°<span className="text-xs text-muted-foreground">–</span>{summary.maxTemp.toFixed(0)}°</p>
          </div>
        </div>

        {/* Mini rain chart */}
        <div>
          <div className="flex items-end gap-[1px] h-6">
            {dayHours.map((h, i) => {
              const maxP = Math.max(summary.maxPrecip, 1);
              const height = Math.max((h.precip_mm / maxP) * 100, h.precip_mm > 0 ? 10 : 0);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${height}%`,
                    backgroundColor: h.precip_mm >= 10 ? 'hsl(var(--destructive))' :
                      h.precip_mm >= 6 ? 'hsl(var(--warning))' :
                      h.precip_mm >= 3 ? 'hsl(var(--primary))' :
                      h.precip_mm >= 0.2 ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--muted))',
                    minHeight: h.precip_mm > 0 ? '2px' : '0px'
                  }}
                  title={`${h.hour}h: ${h.precip_mm.toFixed(1)}mm`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">0h</span>
            <span className="text-[10px] text-muted-foreground">12h</span>
            <span className="text-[10px] text-muted-foreground">23h</span>
          </div>
        </div>

        {/* Active triggers preview */}
        {triggerAnalysis.activeTriggers.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {triggerAnalysis.activeTriggers.slice(0, 2).map(({ trigger, hours }) => (
              <div key={trigger.id} className="flex items-center justify-between text-xs bg-warning/5 rounded px-2 py-0.5">
                <span className="text-warning font-medium truncate mr-2">{trigger.name}</span>
                <span className="text-muted-foreground whitespace-nowrap">{hours}h</span>
              </div>
            ))}
            {triggerAnalysis.activeTriggers.length > 2 && (
              <p className="text-xs text-muted-foreground text-center">+{triggerAnalysis.activeTriggers.length - 2} mais</p>
            )}
          </div>
        )}

        {/* Operational daily summary */}
        {operationalSummary && (
          <div className="mt-2 rounded-lg border border-border/50 bg-muted/10 p-2.5 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resumo Operacional</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {/* BT */}
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400">BT</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-mono font-bold text-foreground">
                    {operationalSummary.totalBtEntry.toFixed(0)}
                    {operationalSummary.hasUplift && (
                      <span className="text-warning ml-1">→ {operationalSummary.totalBtEntryAdj.toFixed(0)}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ret. Op.</span>
                  <span className="font-mono font-bold text-foreground">
                    {operationalSummary.totalBtOpRemoval.toFixed(0)}
                    {operationalSummary.hasUplift && (
                      <span className="text-warning ml-1">→ {operationalSummary.totalBtOpRemovalAdj.toFixed(0)}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ent. Equipe</span>
                  <span className="font-mono font-bold text-foreground">
                    {operationalSummary.btEntryForTeam.toFixed(0)}
                    {operationalSummary.hasUplift && (
                      <span className="text-warning ml-1">→ {operationalSummary.btEntryForTeamAdj.toFixed(0)}</span>
                    )}
                  </span>
                </div>
              </div>
              {/* MT */}
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-orange-500 dark:text-orange-400">MT</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Entrada</span>
                  <span className="font-mono font-bold text-foreground">
                    {operationalSummary.totalMtEntry.toFixed(0)}
                    {operationalSummary.hasUplift && (
                      <span className="text-warning ml-1">→ {operationalSummary.totalMtEntryAdj.toFixed(0)}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ret. Op.</span>
                  <span className="font-mono font-bold text-foreground">
                    {operationalSummary.totalMtOpRemoval.toFixed(0)}
                    {operationalSummary.hasUplift && (
                      <span className="text-warning ml-1">→ {operationalSummary.totalMtOpRemovalAdj.toFixed(0)}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ent. Equipe</span>
                  <span className="font-mono font-bold text-foreground">
                    {operationalSummary.mtEntryForTeam.toFixed(0)}
                    {operationalSummary.hasUplift && (
                      <span className="text-warning ml-1">→ {operationalSummary.mtEntryForTeamAdj.toFixed(0)}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            {/* Equipes Necessárias */}
            <div className="border-t border-border/30 pt-1.5 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Equipes Necessárias</span>
                <span className="font-mono font-bold text-foreground">
                  {operationalSummary.teamsNeeded}
                  {operationalSummary.hasUplift && (
                    <span className="text-warning ml-1">→ {operationalSummary.teamsNeededAdj}</span>
                  )}
                </span>
              </div>
            </div>
            {/* Estrutura Declarada */}
            {showSucursal && eqhSucursal !== null && eqhSucursal !== undefined && (
              <div className="border-t border-border/30 pt-1.5 mt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Estrutura Sucursal
                  </span>
                  <span className="font-mono font-bold text-foreground">{eqhSucursal}</span>
                </div>
              </div>
            )}
            {eqhTotal !== null && (
              <div className="border-t border-border/30 pt-1.5 mt-1">
                <div
                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 rounded px-1 py-0.5 -mx-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenStructure?.();
                  }}
                >
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Estrutura Declarada
                  </span>
                  <span className="font-mono font-bold text-primary">{eqhTotal}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          Clique para detalhes hora a hora
        </p>
      </div>

      <BaseDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        base={base}
        dayHours={dayHours}
        triggers={triggers || []}
        selectedDay={selectedDay}
        provider={provider}
      />
    </>
  );
}

function UTGroupSection({ regionais, allBases, provider, selectedDay, plans, allTypeEntries }: {
  regionais: string[];
  allBases: Base[];
  provider: "openmeteo" | "openweathermap";
  selectedDay: Date;
  plans: DailyTeamPlan[];
  allTypeEntries: TeamTypeEntry[];
}) {
  const [structureRegional, setStructureRegional] = useState<Regional | null>(null);

  const basesInGroup = useMemo(() => {
    const result: { regional: Regional; bases: Base[] }[] = [];
    regionais.forEach(regLabel => {
      const regional = REGIONAIS.find(r => r.label === regLabel);
      if (!regional) return;

      if (regional.sucursais.length === 0) {
        const base = allBases.find(b => b.name.toLowerCase() === regional.label.toLowerCase());
        if (base) result.push({ regional, bases: [base] });
      } else {
        const bases = regional.sucursais
          .map(s => allBases.find(b => b.name.toLowerCase() === s.name.toLowerCase()))
          .filter((b): b is Base => !!b);
        if (bases.length > 0) result.push({ regional, bases });
      }
    });
    return result;
  }, [regionais, allBases]);

  // Compute Eq/h Total per regional
  const eqhPerRegional = useMemo(() => {
    const result: Record<string, number | null> = {};
    basesInGroup.forEach(({ regional, bases }) => {
      const baseIds = bases.map(b => b.id);
      const regionalPlans = plans.filter(p => baseIds.includes(p.base_id));
      if (regionalPlans.length === 0) {
        result[regional.label] = null;
        return;
      }
      const planIds = regionalPlans.map(p => p.id);
      const entries = allTypeEntries.filter(e => planIds.includes(e.daily_plan_id));

      // Sum of turno averages (excluding LV/MK/Reguladas)
      const countedPerHour = Array(24).fill(0);
      const EXCLUDED: readonly string[] = [...LV_MK_TYPES];
      entries.forEach(e => {
        if (!EXCLUDED.includes(e.team_type) && (ALL_DISPLAY_TYPES as readonly string[]).includes(e.team_type)) {
          countedPerHour[e.hour] += e.quantity;
        }
      });
      result[regional.label] = sumTurnoAverages(countedPerHour);
    });
    return result;
  }, [basesInGroup, plans, allTypeEntries]);

  // Compute Eq/h per individual base (sucursal)
  const eqhPerBase = useMemo(() => {
    const result: Record<string, number | null> = {};
    const EXCLUDED: readonly string[] = [...LV_MK_TYPES];
    basesInGroup.forEach(({ bases }) => {
      bases.forEach(base => {
        const basePlans = plans.filter(p => p.base_id === base.id);
        if (basePlans.length === 0) {
          result[base.id] = null;
          return;
        }
        const planIds = basePlans.map(p => p.id);
        const entries = allTypeEntries.filter(e => planIds.includes(e.daily_plan_id));
        const countedPerHour = Array(24).fill(0);
        entries.forEach(e => {
          if (!EXCLUDED.includes(e.team_type) && (ALL_DISPLAY_TYPES as readonly string[]).includes(e.team_type)) {
            countedPerHour[e.hour] += e.quantity;
          }
        });
        result[base.id] = sumTurnoAverages(countedPerHour);
      });
    });
    return result;
  }, [basesInGroup, plans, allTypeEntries]);

  return (
    <>
      <div className={cn(
        "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        regionais.length >= 5 && "xl:grid-cols-5"
      )}>
        {basesInGroup.map(({ regional, bases }) => (
          <div key={regional.label} className="space-y-2 min-w-0">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              {regional.label}
            </h3>
            <div className="flex flex-col gap-3">
              {bases.map(base => (
                <BaseWeatherCard
                  key={base.id}
                  base={base}
                  provider={provider}
                  selectedDay={selectedDay}
                  eqhTotal={eqhPerRegional[regional.label]}
                  eqhSucursal={eqhPerBase[base.id]}
                  showSucursal={bases.length > 1}
                  onOpenStructure={() => setStructureRegional(regional)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {structureRegional && (
        <StructureDetailDialog
          open={!!structureRegional}
          onClose={() => setStructureRegional(null)}
          regional={structureRegional}
          allBases={allBases}
          plans={plans}
          allTypeEntries={allTypeEntries}
          selectedDate={selectedDay}
        />
      )}
    </>
  );
}

// Windy map
const UT_CENTERS = {
  UTN: { lat: -22.0, lon: -41.8, zoom: 8 },
  UTS: { lat: -22.7, lon: -43.2, zoom: 8 },
};

function WeatherMapView({ selectedUT }: { selectedUT: "UTN" | "UTS" }) {
  const center = UT_CENTERS[selectedUT];
  const windyUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${center.zoom}&overlay=rain&product=ecmwf&level=surface&lat=${center.lat}&lon=${center.lon}&detailLat=${center.lat}&detailLon=${center.lon}&marker=true&message=true`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card/50" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
      <iframe
        src={windyUrl}
        className="w-full h-full"
        frameBorder="0"
        title={`Mapa climático ${selectedUT}`}
      />
    </div>
  );
}

export default function Clima() {
  const { data: bases, isLoading: basesLoading } = useBases();
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedUT, setSelectedUT] = useState<"UTN" | "UTS">("UTN");
  const [viewMode, setViewMode] = useState<"cards" | "map">("cards");

  const today = startOfDay(new Date());
  const selectedDay = addDays(today, dayOffset);
  const maxDays = 6;

  const dateStr = format(selectedDay, "yyyy-MM-dd");
  const { data: plans } = useAllPlansForDate(dateStr);
  const planIds = useMemo(() => (plans || []).map(p => p.id), [plans]);
  const { data: allTypeEntries } = useTeamTypeEntriesByPlans(planIds);

  // OpenWeatherMap only returns future 3-hour blocks, so late in the day it
  // cannot provide a complete 00h–23h grid for today. Open-Meteo can.
  const activeProvider: "openmeteo" | "openweathermap" = dayOffset === 0 || dayOffset > 4
    ? "openmeteo"
    : "openweathermap";
  const providerInfo = PROVIDER_LABELS[activeProvider];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <CloudSun className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Central Climática</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">Previsão meteorológica de todas as bases</p>
              <Badge variant="outline" className={cn("text-[10px] gap-1 h-4", providerInfo.color)}>
                <Database className="w-2.5 h-2.5" />
                API: {providerInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={dayOffset <= 0} onClick={() => setDayOffset(d => d - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5 px-2 min-w-[140px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {dayOffset === 0 ? "Hoje" : dayOffset === 1 ? "Amanhã" : format(selectedDay, "EEE, dd/MM", { locale: ptBR })}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={dayOffset >= maxDays} onClick={() => setDayOffset(d => d + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* UT Toggle + View toggle + Day pills */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setSelectedUT("UTN")}
            className={cn(
              "px-4 py-1.5 text-sm font-semibold transition-colors",
              selectedUT === "UTN"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            UTN
          </button>
          <button
            onClick={() => setSelectedUT("UTS")}
            className={cn(
              "px-4 py-1.5 text-sm font-semibold transition-colors",
              selectedUT === "UTS"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            UTS
          </button>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5",
              viewMode === "cards"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={cn(
              "px-3 py-1.5 text-sm transition-colors flex items-center gap-1.5",
              viewMode === "map"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Mapa
          </button>
        </div>

        {viewMode === "cards" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: maxDays + 1 }, (_, i) => {
              const day = addDays(today, i);
              const label = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : format(day, "EEE dd", { locale: ptBR });
              return (
                <Button key={i} variant={dayOffset === i ? "default" : "outline"} size="sm" className="text-xs h-7 whitespace-nowrap shrink-0" onClick={() => setDayOffset(i)}>
                  {label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {viewMode === "map" ? (
        <WeatherMapView selectedUT={selectedUT} />
      ) : basesLoading ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/50 p-4 animate-pulse h-48 w-[220px]" />
          ))}
        </div>
      ) : bases && bases.length > 0 ? (
        <UTGroupSection
          regionais={selectedUT === "UTN" ? UTN_REGIONAIS : UTS_REGIONAIS}
          allBases={bases}
          provider={activeProvider}
          selectedDay={selectedDay}
          plans={plans || []}
          allTypeEntries={allTypeEntries || []}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CloudSun className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma base cadastrada</p>
        </div>
      )}
    </div>
  );
}
