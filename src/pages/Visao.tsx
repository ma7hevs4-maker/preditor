import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBases } from "@/hooks/useBases";
import { DailyTeamPlan, planToTeamsArray, planToLossTeamsArray } from "@/hooks/useDailyTeamPlans";
import { useTeamTypeEntriesByPlans, entriesToMap } from "@/hooks/useTeamTypeEntries";
import { TEAM_TYPES, TURNOS } from "@/data/teamTypes";

// Fetch all plans for a specific date (all bases)
const useAllPlansForDate = (date: string) => {
  return useQuery({
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
};

const Visao = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: bases } = useBases();

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: plans } = useAllPlansForDate(dateStr);

  const planIds = useMemo(() => (plans || []).map(p => p.id), [plans]);
  const { data: allTypeEntries } = useTeamTypeEntriesByPlans(planIds);

  const entriesByPlan = useMemo(() => {
    const map: Record<string, ReturnType<typeof entriesToMap>> = {};
    if (allTypeEntries && plans) {
      plans.forEach(p => {
        const planEntries = allTypeEntries.filter(e => e.daily_plan_id === p.id);
        map[p.id] = entriesToMap(planEntries);
      });
    }
    return map;
  }, [allTypeEntries, plans]);

  const basesMap = useMemo(() => {
    const m: Record<string, string> = {};
    bases?.forEach(b => { m[b.id] = b.name; });
    return m;
  }, [bases]);

  const navigateDate = (dir: "prev" | "next") => {
    setSelectedDate(prev => addDays(prev, dir === "prev" ? -1 : 1));
  };

  const getTurnoTotal = (typeMap: Record<string, Record<number, number>>, type: string, turnoHours: readonly number[]) => {
    return turnoHours.reduce((sum, h) => sum + (typeMap[type]?.[h] || 0), 0);
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 pl-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Visão de Estrutura</h1>
          <p className="text-sm text-muted-foreground">Visualização resumida das equipes planejadas por base</p>
        </div>

        {/* Date Navigation */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("prev")}><ChevronLeft className="h-4 w-4" /></Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[160px] h-8 justify-start text-left font-normal text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("next")}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Base cards */}
        {!plans || plans.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <Eye className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum plano encontrado</h3>
            <p className="text-sm text-muted-foreground">Não há planejamento para {format(selectedDate, "dd/MM/yyyy")}. Crie um na aba Estrutura.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map(plan => {
              const teams = planToTeamsArray(plan);
              const losses = planToLossTeamsArray(plan);
              const typeMap = entriesByPlan[plan.id] || {};
              const totalTeams = teams.reduce((s, v) => s + v, 0);
              const totalLoss = losses.reduce((s, v) => s + v, 0);
              const baseName = basesMap[plan.base_id] || "Base";

              return (
                <Dialog key={plan.id}>
                  <DialogTrigger asChild>
                    <div className="glass-card p-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">{baseName}</h3>
                        <Badge variant="secondary" className="text-xs">{totalTeams} eq×h</Badge>
                      </div>

                      {/* Turno summary */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {TURNOS.map(turno => (
                          <div key={turno.letter} className="bg-muted/50 rounded-md p-2 text-center">
                            <div className="text-[10px] text-muted-foreground font-medium">{turno.letter}</div>
                            <div className="text-sm font-bold text-foreground">
                              {turno.hours.reduce((s, h) => s + teams[h], 0)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Type totals (non-zero only) */}
                      <div className="space-y-1">
                        {TEAM_TYPES.filter(type =>
                          TURNOS.some(t => getTurnoTotal(typeMap, type, t.hours) > 0)
                        ).map(type => (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate">{type}</span>
                            <div className="flex gap-2">
                              {TURNOS.map(t => (
                                <span key={t.letter} className="w-6 text-center font-mono text-foreground">
                                  {getTurnoTotal(typeMap, type, t.hours)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalLoss > 0 && (
                        <div className="mt-2 text-xs text-destructive">Perdas: {totalLoss}</div>
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Detalhe - {baseName} - {format(selectedDate, "dd/MM/yyyy")}</DialogTitle>
                    </DialogHeader>
                    {TURNOS.map(turno => (
                      <div key={turno.letter} className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">{turno.label}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="text-left py-1 pr-2 text-muted-foreground min-w-[100px]">Tipo</th>
                                {turno.hours.map(h => (
                                  <th key={h} className="text-center py-1 px-1 text-muted-foreground font-mono min-w-[40px]">
                                    {String(h).padStart(2, "0")}h
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t border-border font-medium">
                                <td className="py-1 text-foreground">Equipes</td>
                                {turno.hours.map(h => <td key={h} className="text-center py-1 text-foreground">{teams[h]}</td>)}
                              </tr>
                              <tr className="text-destructive">
                                <td className="py-1">Perdas</td>
                                {turno.hours.map(h => <td key={h} className="text-center py-1">{losses[h]}</td>)}
                              </tr>
                              <tr><td colSpan={turno.hours.length + 1}><div className="border-t border-border/50 my-1" /></td></tr>
                              {TEAM_TYPES.map(type => (
                                <tr key={type} className="hover:bg-muted/30">
                                  <td className="py-0.5 text-muted-foreground truncate">{type}</td>
                                  {turno.hours.map(h => (
                                    <td key={h} className="text-center py-0.5 font-mono">
                                      {typeMap[type]?.[h] || 0}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Visao;
