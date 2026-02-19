import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save, Loader2, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBases } from "@/hooks/useBases";
import { useTeamStructures, structureToTeamsArray, structureToLossTeamsArray } from "@/hooks/useTeamStructures";
import { useDailyTeamPlan, useUpsertDailyTeamPlan, useDeleteDailyTeamPlan, planToTeamsArray, planToLossTeamsArray, teamsArrayToPlanFields } from "@/hooks/useDailyTeamPlans";
import { toast } from "@/hooks/use-toast";

const TURNOS = [
  { label: "Turno A (0-7h)", hours: [0, 1, 2, 3, 4, 5, 6, 7] },
  { label: "Turno B (8-15h)", hours: [8, 9, 10, 11, 12, 13, 14, 15] },
  { label: "Turno C (16-23h)", hours: [16, 17, 18, 19, 20, 21, 22, 23] },
];

const Estrutura = () => {
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [teams, setTeams] = useState<number[]>(Array(24).fill(0));
  const [lossTeams, setLossTeams] = useState<number[]>(Array(24).fill(0));
  const [isDirty, setIsDirty] = useState(false);

  const { data: bases } = useBases();
  const { data: teamStructures } = useTeamStructures(selectedBaseId || null);

  // Set first base as default
  useMemo(() => {
    if (bases && bases.length > 0 && !selectedBaseId) {
      setSelectedBaseId(bases[0].id);
    }
  }, [bases, selectedBaseId]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: existingPlan, isLoading: planLoading } = useDailyTeamPlan(selectedBaseId || null, dateStr);
  const upsertPlan = useUpsertDailyTeamPlan();
  const deletePlan = useDeleteDailyTeamPlan();

  // Load existing plan when it changes
  useMemo(() => {
    if (existingPlan) {
      setTeams(planToTeamsArray(existingPlan));
      setLossTeams(planToLossTeamsArray(existingPlan));
      setIsDirty(false);
    } else if (!planLoading) {
      setTeams(Array(24).fill(0));
      setLossTeams(Array(24).fill(0));
      setIsDirty(false);
    }
  }, [existingPlan, planLoading]);

  const handleTeamChange = (hour: number, value: number) => {
    setTeams(prev => {
      const next = [...prev];
      next[hour] = value;
      return next;
    });
    setIsDirty(true);
  };

  const handleLossTeamChange = (hour: number, value: number) => {
    setLossTeams(prev => {
      const next = [...prev];
      next[hour] = value;
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedBaseId) return;

    try {
      await upsertPlan.mutateAsync({
        base_id: selectedBaseId,
        plan_date: dateStr,
        ...teamsArrayToPlanFields(teams, lossTeams),
      } as any);
      setIsDirty(false);
      toast({ title: "Plano salvo", description: `Equipes para ${format(selectedDate, "dd/MM/yyyy")} salvas com sucesso.` });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!existingPlan) return;
    try {
      await deletePlan.mutateAsync(existingPlan.id);
      toast({ title: "Plano removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleCopyFromStructure = (structureId: string) => {
    const structure = teamStructures?.find(s => s.id === structureId);
    if (!structure) return;
    setTeams(structureToTeamsArray(structure));
    setLossTeams(structureToLossTeamsArray(structure));
    setIsDirty(true);
    toast({ title: "Estrutura copiada", description: `"${structure.name}" aplicada.` });
  };

  const selectedBase = bases?.find(b => b.id === selectedBaseId);
  const totalTeams = teams.reduce((s, v) => s + v, 0);
  const avgTeams = totalTeams / 24;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 pl-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Estrutura de Equipes</h1>
          <p className="text-sm text-muted-foreground">Planeje a quantidade de equipes por hora para dias específicos</p>
        </div>

        {/* Controls */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Base Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Base</label>
              <Select value={selectedBaseId} onValueChange={setSelectedBaseId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione uma base" />
                </SelectTrigger>
                <SelectContent>
                  {bases?.map(base => (
                    <SelectItem key={base.id} value={base.id}>{base.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[200px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Copy from Structure */}
            {teamStructures && teamStructures.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Copiar de estrutura</label>
                <Select onValueChange={handleCopyFromStructure}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecionar estrutura..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamStructures.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <Copy className="w-3 h-3" />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 ml-auto">
              {existingPlan && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletePlan.isPending}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              )}
              <Button onClick={handleSave} disabled={!isDirty || upsertPlan.isPending} size="sm">
                {upsertPlan.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Salvar
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            <span>Total equipes×hora: <strong className="text-foreground">{totalTeams}</strong></span>
            <span>Média: <strong className="text-foreground">{avgTeams.toFixed(1)} eq/h</strong></span>
            {existingPlan && <span className="text-primary font-medium">● Plano salvo</span>}
            {isDirty && <span className="text-warning font-medium">● Não salvo</span>}
          </div>
        </div>

        {/* Hourly Grid by Turno */}
        {planLoading ? (
          <div className="glass-card p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span>Carregando plano...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {TURNOS.map(turno => (
              <div key={turno.label} className="glass-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{turno.label}</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {turno.hours.map(hour => (
                    <div key={hour} className="space-y-1">
                      <label className="text-xs text-muted-foreground font-mono">{String(hour).padStart(2, "0")}:00</label>
                      <Input
                        type="number"
                        min={0}
                        value={teams[hour]}
                        onChange={(e) => handleTeamChange(hour, parseInt(e.target.value) || 0)}
                        className="h-8 text-center text-sm font-mono"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={lossTeams[hour]}
                        onChange={(e) => handleLossTeamChange(hour, parseInt(e.target.value) || 0)}
                        className="h-8 text-center text-sm font-mono text-destructive border-destructive/30"
                        placeholder="Perda"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Equipes: <strong>{turno.hours.reduce((s, h) => s + teams[h], 0)}</strong></span>
                  <span className="text-destructive">Perdas: <strong>{turno.hours.reduce((s, h) => s + lossTeams[h], 0)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Estrutura;
