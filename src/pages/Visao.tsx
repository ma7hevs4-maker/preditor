import { useState, useMemo } from "react";
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
import { useTeamTypeEntriesByPlans, entriesToMap, TeamTypeEntry } from "@/hooks/useTeamTypeEntries";
import { TEAM_TYPES, TURNOS } from "@/data/teamTypes";
import { REGIONAIS, Regional } from "@/data/basesConfig";

// ---------- Constants ----------
const UTS_LABELS = ["Magé", "Niterói", "São Gonçalo", "Serrana", "Sul"];
const UTN_LABELS = ["Campos", "Macaé", "Lagos", "Noroeste"];

type UT = "UTS" | "UTN";

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
  },
  B: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    header: "bg-amber-500/20 text-amber-400",
    cell: "text-amber-300",
  },
  C: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    header: "bg-purple-500/20 text-purple-400",
    cell: "text-purple-300",
  },
} as const;

function sumEntriesByHour(entries: TeamTypeEntry[], types: readonly string[]): number[] {
  const result = Array(24).fill(0);
  entries.forEach(e => {
    if (types.includes(e.team_type)) result[e.hour] += e.quantity;
  });
  return result;
}

// ---------- Detail Dialog ----------
interface RegionalDetailDialogProps {
  open: boolean;
  onClose: () => void;
  regional: Regional;
  basesMap: Record<string, string>; // id -> name
  allBases: { id: string; name: string }[];
  plans: DailyTeamPlan[];
  allTypeEntries: TeamTypeEntry[];
  selectedDate: Date;
}

const GERAIS_TYPES = ["Emergência", "Gestores", "Poda", "Cesto Manutenção", "Cesto Obras"] as const;
const BT_ONLY_TYPES = ["Corte e Religa", "Perdas", "Reguladas"] as const;
const ALL_DISPLAY_TYPES = [...GERAIS_TYPES, ...BT_ONLY_TYPES] as const;

const RegionalDetailDialog = ({
  open, onClose, regional, basesMap, allBases, plans, allTypeEntries, selectedDate,
}: RegionalDetailDialogProps) => {
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");

  const hasSucursais = regional.sucursais.length > 0;

  // Get base IDs belonging to this regional
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

  // Filter plans for this regional
  const regionalPlans = useMemo(
    () => plans.filter(p => regionalBaseIds.includes(p.base_id)),
    [plans, regionalBaseIds]
  );

  // Plans filtered by selected sucursal
  const filteredPlans = useMemo(() => {
    if (selectedSucursal === "todas" || !hasSucursais) return regionalPlans;
    const sucursalBase = allBases.find(
      b => b.name.toLowerCase() === selectedSucursal.toLowerCase()
    );
    if (!sucursalBase) return [];
    return regionalPlans.filter(p => p.base_id === sucursalBase.id);
  }, [regionalPlans, selectedSucursal, hasSucursais, allBases]);

  const filteredPlanIds = filteredPlans.map(p => p.id);

  // Entries for filtered plans
  const filteredEntries = useMemo(
    () => allTypeEntries.filter(e => filteredPlanIds.includes(e.daily_plan_id)),
    [allTypeEntries, filteredPlanIds]
  );

  // Aggregate teams and losses per hour
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

  // Type-specific per hour (sum across filtered plans)
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[95vw] w-full max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle>
              Detalhe - {regional.label} - {format(selectedDate, "dd/MM/yyyy")}
            </DialogTitle>
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
        </DialogHeader>

        {filteredPlans.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Nenhum plano encontrado para esta seleção.
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            {TURNOS.map(turno => {
              const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
              return (
                <div key={turno.letter} className={cn("rounded-lg border p-3", colors.bg, colors.border)}>
                  <div className={cn("text-xs font-semibold px-2 py-1 rounded mb-3 inline-block", colors.header)}>
                    {turno.label}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="text-left py-1 pr-3 text-muted-foreground font-medium min-w-[130px]">Tipo</th>
                          {turno.hours.map(h => (
                            <th key={h} className={cn("text-center py-1 px-1 font-mono font-medium min-w-[36px]", colors.cell)}>
                              {String(h).padStart(2, "0")}h
                            </th>
                          ))}
                          <th className="text-center py-1 px-2 text-muted-foreground font-medium min-w-[40px]">Σ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Equipes Totais */}
                        <tr className="border-t border-border/40 font-semibold">
                          <td className="py-1.5 text-foreground">Equipes</td>
                          {turno.hours.map(h => (
                            <td key={h} className="text-center py-1.5 text-foreground font-mono">{teamsPerHour[h]}</td>
                          ))}
                          <td className="text-center py-1.5 text-foreground font-mono font-bold">
                            {turno.hours.reduce((s, h) => s + teamsPerHour[h], 0)}
                          </td>
                        </tr>
                        {/* Perdas */}
                        <tr className="text-destructive/80">
                          <td className="py-1">Perdas</td>
                          {turno.hours.map(h => (
                            <td key={h} className="text-center py-1 font-mono">{lossesPerHour[h]}</td>
                          ))}
                          <td className="text-center py-1 font-mono">
                            {turno.hours.reduce((s, h) => s + lossesPerHour[h], 0)}
                          </td>
                        </tr>
                        {/* Separator */}
                        <tr><td colSpan={turno.hours.length + 2}><div className="border-t border-border/30 my-1" /></td></tr>
                        {/* GERAIS types */}
                        {GERAIS_TYPES.map(type => {
                          const row = typePerHour[type] || [];
                          const total = turno.hours.reduce((s, h) => s + (row[h] || 0), 0);
                          if (total === 0) return null;
                          return (
                            <tr key={type} className="hover:bg-muted/20">
                              <td className="py-0.5 text-muted-foreground truncate pr-2">{type}</td>
                              {turno.hours.map(h => (
                                <td key={h} className="text-center py-0.5 font-mono text-foreground">{row[h] || 0}</td>
                              ))}
                              <td className="text-center py-0.5 font-mono text-foreground">{total}</td>
                            </tr>
                          );
                        })}
                        {/* BT separator */}
                        {BT_ONLY_TYPES.some(type => turno.hours.some(h => (typePerHour[type]?.[h] || 0) > 0)) && (
                          <tr><td colSpan={turno.hours.length + 2}><div className="border-t border-border/20 my-0.5" /></td></tr>
                        )}
                        {/* BT ONLY types */}
                        {BT_ONLY_TYPES.map(type => {
                          const row = typePerHour[type] || [];
                          const total = turno.hours.reduce((s, h) => s + (row[h] || 0), 0);
                          if (total === 0) return null;
                          return (
                            <tr key={type} className="hover:bg-muted/20">
                              <td className="py-0.5 text-warning truncate pr-2">{type}</td>
                              {turno.hours.map(h => (
                                <td key={h} className="text-center py-0.5 font-mono text-warning/80">{row[h] || 0}</td>
                              ))}
                              <td className="text-center py-0.5 font-mono text-warning/80">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
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

  const teamsPerHour = useMemo(() => {
    const arr = Array(24).fill(0);
    regionalPlans.forEach(p => {
      const t = planToTeamsArray(p);
      t.forEach((v, h) => { arr[h] += v; });
    });
    return arr;
  }, [regionalPlans]);

  const totalTeams = teamsPerHour.reduce((s, v) => s + v, 0);
  const hasData = regionalPlans.length > 0;

  return (
    <div
      onClick={hasData ? onOpen : undefined}
      className={cn(
        "glass-card p-4 transition-all",
        hasData ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : "opacity-50"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{regional.label}</h3>
        {hasData ? (
          <Badge variant="secondary" className="text-xs">{totalTeams} eq×h</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Sem plano</Badge>
        )}
      </div>

      {hasSucursais && (
        <p className="text-[10px] text-muted-foreground mb-2">
          {regional.sucursais.map(s => s.name).join(" · ")}
        </p>
      )}

      {/* Turno summary */}
      <div className="grid grid-cols-3 gap-2">
        {TURNOS.map(turno => {
          const colors = TURNO_COLORS[turno.letter as keyof typeof TURNO_COLORS];
          const total = turno.hours.reduce((s, h) => s + teamsPerHour[h], 0);
          return (
            <div key={turno.letter} className={cn("rounded-md p-2 text-center border", colors.bg, colors.border)}>
              <div className={cn("text-[10px] font-medium mb-0.5", colors.cell)}>{turno.letter}</div>
              <div className="text-sm font-bold text-foreground">{total}</div>
            </div>
          );
        })}
      </div>
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

            {/* UT description */}
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
