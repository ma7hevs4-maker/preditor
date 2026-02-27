import React, { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBases } from "@/hooks/useBases";
import { DailyTeamPlan, planToTeamsArray, planToLossTeamsArray } from "@/hooks/useDailyTeamPlans";
import { useTeamTypeEntriesByPlans, TeamTypeEntry } from "@/hooks/useTeamTypeEntries";
import { TURNOS } from "@/data/teamTypes";
import { REGIONAIS, Regional } from "@/data/basesConfig";

// ---------- Constants ----------
const UTS_LABELS = ["Magé", "Niterói", "São Gonçalo", "Serrana", "Sul"];
const UTN_LABELS = ["Campos", "Macaé", "Lagos", "Noroeste"];

type UT = "UTS" | "UTN";

const GERAIS_TYPES = ["Emergência", "Gestores", "Poda", "Cesto Manutenção", "Cesto Obras"] as const;
const LV_MK_TYPES = ["LV Manutenção", "LV Obras", "MK Manutenção", "MK Obras"] as const;
const APOIO_TYPES = ["Apoio UTS", "Apoio UTN"] as const;
const BT_ONLY_TYPES = ["Corte e Religa", "Perdas", "Reguladas"] as const;
const ALL_DISPLAY_TYPES = [...GERAIS_TYPES, ...LV_MK_TYPES, ...APOIO_TYPES, ...BT_ONLY_TYPES] as const;
// Types counted for all incidents (not just BT)
const ALL_INCIDENTS_TYPES = [...GERAIS_TYPES, ...APOIO_TYPES] as const;

// ---------- Data hooks ----------
const useAllPlansForDate = (date: string) =>
  useQuery({
    queryKey: ["all_daily_plans_date", date],
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

// ---------- Helpers ----------
const TURNO_COLORS = {
  A: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    header: "bg-blue-500/20 text-blue-400",
    cell: "text-blue-300",
    badge: "bg-blue-500/20 border border-blue-500/30 text-blue-300",
    avgCell: "bg-blue-500/20 text-blue-300 font-bold",
    avgHeader: "bg-blue-500/30 text-blue-300 font-bold",
  },
  B: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    header: "bg-amber-500/20 text-amber-400",
    cell: "text-amber-300",
    badge: "bg-amber-500/20 border border-amber-500/30 text-amber-300",
    avgCell: "bg-amber-500/20 text-amber-300 font-bold",
    avgHeader: "bg-amber-500/30 text-amber-300 font-bold",
  },
  C: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    header: "bg-purple-500/20 text-purple-400",
    cell: "text-purple-300",
    badge: "bg-purple-500/20 border border-purple-500/30 text-purple-300",
    avgCell: "bg-purple-500/20 text-purple-300 font-bold",
    avgHeader: "bg-purple-500/30 text-purple-300 font-bold",
  },
} as const;

function avg(arr: number[], hours: readonly number[]): number {
  if (hours.length === 0) return 0;
  const sum = hours.reduce((s, h) => s + arr[h], 0);
  return Math.round(sum / hours.length);
}

// ---------- Detail Dialog ----------
interface RegionalDetailDialogProps {
  open: boolean;
  onClose: () => void;
  regional: Regional;
  basesMap: Record<string, string>;
  allBases: { id: string; name: string }[];
  plans: DailyTeamPlan[];
  allTypeEntries: TeamTypeEntry[];
  selectedDate: Date;
}

const RegionalDetailDialog = ({
  open, onClose, regional, basesMap, allBases, plans, allTypeEntries, selectedDate,
}: RegionalDetailDialogProps) => {
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");

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

  const regionalPlans = useMemo(
    () => plans.filter(p => regionalBaseIds.includes(p.base_id)),
    [plans, regionalBaseIds]
  );

  const filteredPlans = useMemo(() => {
    if (selectedSucursal === "todas" || !hasSucursais) return regionalPlans;
    const sucursalBase = allBases.find(
      b => b.name.toLowerCase() === selectedSucursal.toLowerCase()
    );
    if (!sucursalBase) return [];
    return regionalPlans.filter(p => p.base_id === sucursalBase.id);
  }, [regionalPlans, selectedSucursal, hasSucursais, allBases]);

  const filteredPlanIds = filteredPlans.map(p => p.id);

  const filteredEntries = useMemo(
    () => allTypeEntries.filter(e => filteredPlanIds.includes(e.daily_plan_id)),
    [allTypeEntries, filteredPlanIds]
  );

  const teamsPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    filteredPlans.forEach(p => {
      const t = planToTeamsArray(p);
      t.forEach((v, h) => { arr[h] += v; });
    });
    return arr;
  }, [filteredPlans]);

  const lossesPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    filteredPlans.forEach(p => {
      const l = planToLossTeamsArray(p);
      l.forEach((v, h) => { arr[h] += v; });
    });
    return arr;
  }, [filteredPlans]);

  const typePerHour = useMemo((): Record<string, number[]> => {
    const map: Record<string, number[]> = {};
    ALL_DISPLAY_TYPES.forEach(type => {
      map[type] = Array(24).fill(0);
    });
    filteredEntries.forEach(e => {
      if (map[e.team_type]) map[e.team_type][e.hour] += e.quantity;
    });
    return map;
  }, [filteredEntries]);

  const sucursalOptions = hasSucursais ? regional.sucursais.map(s => s.name) : [];

  // 24h averages
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const avgTotalTeams24h = avg(teamsPerHour, allHours);
  const totalBT24h = allHours.reduce((s, h) => {
    return s + BT_ONLY_TYPES.reduce((bs, type) => bs + (typePerHour[type]?.[h] || 0), 0);
  }, 0);
  const avgBT24h = Math.round(totalBT24h / 24);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[98vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle>
              Detalhe - {regional.label} - {format(selectedDate, "dd/MM/yyyy")}
            </DialogTitle>
            {hasSucursais && (
              <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                <SelectTrigger className="w-[200px] h-8 text-sm">
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
        </DialogHeader>

        {filteredPlans.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Nenhum plano encontrado para esta seleção.
          </div>
        ) : (
          <>
            {/* Unified table: types as rows, turnos as column groups */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    {/* Type column header */}
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium min-w-[120px] sticky left-0 bg-background z-10">
                      Tipo
                    </th>
                    {/* Each turno group */}
                    {TURNOS.map(turno => {
                      const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                      return (
                        <>
                          {/* Turno header spanning its hours + avg */}
                          <th
                            key={`th-${turno.letter}`}
                            colSpan={turno.hours.length + 1}
                            className={cn("text-center py-1 px-1 font-semibold text-xs rounded-t border-b", colors.header)}
                          >
                            {turno.label}
                          </th>
                          {/* Spacer between turnos */}
                          {turno.letter !== "C" && <th className="w-2" />}
                        </>
                      );
                    })}
                  </tr>
                  <tr>
                    <th className="sticky left-0 bg-background z-10" />
                    {TURNOS.map(turno => {
                      const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                      return (
                        <>
                          {turno.hours.map(h => (
                            <th key={h} className={cn("text-center py-1 px-0.5 font-mono font-medium min-w-[24px]", colors.cell)}>
                              {String(h).padStart(2, "0")}
                            </th>
                          ))}
                          <th className={cn("text-center py-1 px-1 font-medium min-w-[32px] rounded-sm", colors.avgHeader)}>x̄</th>
                          {turno.letter !== "C" && <th className="w-2" />}
                        </>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* GERAIS types */}
                  {GERAIS_TYPES.map((type, idx) => {
                    const row = typePerHour[type] || [];
                    const hasAny = TURNOS.some(t => t.hours.some(h => (row[h] || 0) > 0));
                    if (!hasAny) return null;
                    return (
                      <tr key={type} className={cn("hover:bg-muted/20", idx === 0 && "border-t border-border/30")}>
                        <td className="py-0.5 text-muted-foreground pr-2 sticky left-0 bg-background z-10">{type}</td>
                        {TURNOS.map(turno => {
                          const tc = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
                          return (
                            <React.Fragment key={turno.letter}>
                              {turno.hours.map(h => (
                                <td key={h} className="text-center py-0.5 font-mono text-foreground">{row[h] || 0}</td>
                              ))}
                              <td className={cn("text-center py-0.5 font-mono rounded-sm", tc.avgCell)}>
                                {avg(row, turno.hours)}
                              </td>
                              {turno.letter !== "C" && <td className="w-2" />}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Separator before LV/MK types */}
                  <tr><td colSpan={100}><div className="border-t border-border/20 my-1" /></td></tr>
                  {/* LV/MK types (display only, not counted in totals) */}
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
                              <td className={cn("text-center py-0.5 font-mono rounded-sm opacity-60", tc.avgCell)}>
                                {avg(row, turno.hours)}
                              </td>
                              {turno.letter !== "C" && <td className="w-2" />}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Separator before Apoio types */}
                  <tr><td colSpan={100}><div className="border-t border-border/20 my-1" /></td></tr>
                  {/* Apoio types (counted for all incidents) */}
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
                              <td className={cn("text-center py-0.5 font-mono rounded-sm", tc.avgCell)}>
                                {avg(row, turno.hours)}
                              </td>
                              {turno.letter !== "C" && <td className="w-2" />}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Separator before BT types */}
                  <tr><td colSpan={100}><div className="border-t border-border/20 my-1" /></td></tr>
                  {/* BT ONLY types */}
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
                              <td className={cn("text-center py-0.5 font-mono rounded-sm", tc.avgCell, "text-warning")}>
                                {avg(row, turno.hours)}
                              </td>
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

            {/* 24h summary footer */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-border/30 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Média equipes totais (24h):</span>
                <span className="font-bold text-foreground">{avgTotalTeams24h}</span>
              </div>
              <div className="w-px h-4 bg-border self-center" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Média equipes BT (24h):</span>
                <span className="font-bold text-warning">{avgBT24h}</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------- Regional Card ----------
interface RegionalCardProps {
  regional: Regional;
  plans: DailyTeamPlan[];
  allTypeEntries: TeamTypeEntry[];
  allBases: { id: string; name: string }[];
  onOpen: () => void;
}

const RegionalCard = ({ regional, plans, allTypeEntries, allBases, onOpen }: RegionalCardProps) => {
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

  const regionalPlans = useMemo(
    () => plans.filter(p => regionalBaseIds.includes(p.base_id)),
    [plans, regionalBaseIds]
  );

  const regionalPlanIds = regionalPlans.map(p => p.id);
  const regionalEntries = useMemo(
    () => allTypeEntries.filter(e => regionalPlanIds.includes(e.daily_plan_id)),
    [allTypeEntries, regionalPlanIds]
  );

  const allHours = Array.from({ length: 24 }, (_, i) => i);

  // teamsPerHour = sum of GERAIS_TYPES per hour (from entries, same logic as modal)
  const teamsPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    regionalEntries.forEach(e => {
      if ((ALL_INCIDENTS_TYPES as readonly string[]).includes(e.team_type)) arr[e.hour] += e.quantity;
    });
    return arr;
  }, [regionalEntries]);

  const btPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    regionalEntries.forEach(e => {
      if ((BT_ONLY_TYPES as readonly string[]).includes(e.team_type)) arr[e.hour] += e.quantity;
    });
    return arr;
  }, [regionalEntries]);

  const avgTotalTeams24h = avg(teamsPerHour, allHours);
  const avgBT24h = avg(btPerHour, allHours);
  const hasData = regionalPlans.length > 0;

  // Per-type 24h averages (all types including LV/MK)
  const typeAvg24h = useMemo(() => {
    const allTypes = [...GERAIS_TYPES, ...BT_ONLY_TYPES, ...LV_MK_TYPES, ...APOIO_TYPES];
    const result: Record<string, number> = {};
    allTypes.forEach(type => {
      const arr = Array(24).fill(0);
      regionalEntries.forEach(e => {
        if (e.team_type === type) arr[e.hour] += e.quantity;
      });
      result[type] = avg(arr, allHours);
    });
    return result;
  }, [regionalEntries]);

  return (
    <div
      onClick={hasData ? onOpen : undefined}
      className={cn(
        "glass-card p-4 transition-all",
        hasData ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : "opacity-50"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-foreground">{regional.label}</h3>
        {hasData ? (
          <Badge variant="secondary" className="text-xs">{avgTotalTeams24h} eq/h</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Sem plano</Badge>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mb-2 h-4 truncate">
        {hasSucursais ? regional.sucursais.map(s => s.name).join(" · ") : ""}
      </p>

      {/* Turno averages */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {TURNOS.map(turno => {
          const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
          const avgVal = avg(teamsPerHour, turno.hours);
          return (
            <div key={turno.letter} className={cn("rounded-md p-2 text-center border", colors.bg, colors.border)}>
              <div className={cn("text-[10px] font-medium mb-0.5", colors.cell)}>{turno.letter}</div>
              <div className="text-sm font-bold text-foreground">{avgVal}</div>
            </div>
          );
        })}
      </div>

      {/* Type averages list */}
      {hasData && (
        <div className="border-t border-border/30 pt-2 mb-2 space-y-0.5">
          {GERAIS_TYPES.map(type => {
            const val = typeAvg24h[type] || 0;
            if (val === 0) return null;
            return (
              <div key={type} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">{type}</span>
                <span className="font-semibold text-foreground">{val}</span>
              </div>
            );
          })}
          {LV_MK_TYPES.map(type => {
            const val = typeAvg24h[type] || 0;
            if (val === 0) return null;
            return (
              <div key={type} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">{type}</span>
                <span className="font-semibold text-muted-foreground/80">{val}</span>
              </div>
            );
          })}
          {APOIO_TYPES.map(type => {
            const val = typeAvg24h[type] || 0;
            if (val === 0) return null;
            return (
              <div key={type} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">{type}</span>
                <span className="font-semibold text-foreground">{val}</span>
              </div>
            );
          })}
          {BT_ONLY_TYPES.map(type => {
            const val = typeAvg24h[type] || 0;
            if (val === 0) return null;
            return (
              <div key={type} className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">{type}</span>
                <span className="font-semibold text-warning">{val}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 24h summary */}
      {hasData && (
        <div className="border-t border-border/30 pt-2 flex justify-between text-[10px]">
          <div className="flex flex-col items-center">
            <span className="text-muted-foreground">Eq. Totais (24h)</span>
            <span className="font-bold text-foreground">{avgTotalTeams24h}</span>
          </div>
          <div className="w-px bg-border/50" />
          <div className="flex flex-col items-center">
            <span className="text-muted-foreground">Eq. BT (24h)</span>
            <span className="font-bold text-warning">{avgBT24h}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Main Page ----------
const Visao = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUT, setSelectedUT] = useState<UT>("UTS");
  const [openRegional, setOpenRegional] = useState<string | null>(null);

  const { data: bases } = useBases();
  const allBases = useMemo(() => bases || [], [bases]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: plans } = useAllPlansForDate(dateStr);

  const planIds = useMemo(() => (plans || []).map(p => p.id), [plans]);
  const { data: allTypeEntries } = useTeamTypeEntriesByPlans(planIds);

  const basesMap = useMemo(() => {
    const m: Record<string, string> = {};
    allBases.forEach(b => { m[b.id] = b.name; });
    return m;
  }, [allBases]);

  const navigateDate = (dir: "prev" | "next") => {
    setSelectedDate(prev => addDays(prev, dir === "prev" ? -1 : 1));
  };

  const utLabels = selectedUT === "UTS" ? UTS_LABELS : UTN_LABELS;
  const visibleRegionais = REGIONAIS.filter(r => utLabels.includes(r.label));

  const openRegionalData = openRegional
    ? REGIONAIS.find(r => r.label === openRegional) ?? null
    : null;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 pl-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Visão de Estrutura</h1>
          <p className="text-sm text-muted-foreground">Visualização das equipes planejadas por regional</p>
        </div>

        {/* Controls */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* UT selector */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["UTS", "UTN"] as UT[]).map(ut => (
                <button
                  key={ut}
                  onClick={() => setSelectedUT(ut)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-semibold transition-colors",
                    selectedUT === ut
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {ut}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Date navigation */}
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] h-8 justify-start text-left font-normal text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={d => d && setSelectedDate(d)}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <span className="text-xs text-muted-foreground ml-1">
              {selectedUT === "UTS"
                ? "Magé · Niterói · São Gonçalo · Serrana · Sul"
                : "Campos · Macaé · Lagos · Noroeste"}
            </span>
          </div>
        </div>

        {/* Regional Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {visibleRegionais.map(regional => (
            <RegionalCard
              key={regional.label}
              regional={regional}
              plans={plans || []}
              allTypeEntries={allTypeEntries || []}
              allBases={allBases}
              onOpen={() => setOpenRegional(regional.label)}
            />
          ))}
        </div>

        {/* No plans at all */}
        {(!plans || plans.length === 0) && (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center mt-4">
            <Eye className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum plano encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Não há planejamento para {format(selectedDate, "dd/MM/yyyy")}. Crie um na aba Estrutura.
            </p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {openRegionalData && (
        <RegionalDetailDialog
          open={!!openRegional}
          onClose={() => setOpenRegional(null)}
          regional={openRegionalData}
          basesMap={basesMap}
          allBases={allBases}
          plans={plans || []}
          allTypeEntries={allTypeEntries || []}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default Visao;
