import { useState, useMemo, useCallback } from "react";
import { format, addDays, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save, Loader2, Copy, Trash2, ChevronLeft, ChevronRight, CalendarDays, X, Pencil, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBases } from "@/hooks/useBases";
import { useTeamStructures, structureToTeamsArray, structureToLossTeamsArray, useAddTeamStructure } from "@/hooks/useTeamStructures";
import { useDailyTeamPlan, useUpsertDailyTeamPlan, useDeleteDailyTeamPlan, useDailyTeamPlans, planToTeamsArray, planToLossTeamsArray, teamsArrayToPlanFields } from "@/hooks/useDailyTeamPlans";
import { useTeamTypeEntries, entriesToMap, useUpsertTeamTypeEntries } from "@/hooks/useTeamTypeEntries";
import { TEAM_TYPES, TURNOS } from "@/data/teamTypes";
import { toast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "dys";

const Estrutura = () => {
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
  const [planningMode, setPlanningMode] = useState<"single" | "period">("single");
  const [teams, setTeams] = useState<number[]>(Array(24).fill(0));
  const [lossTeams, setLossTeams] = useState<number[]>(Array(24).fill(0));
  // typeData: { [teamType]: number[] (24 hours) }
  const [typeData, setTypeData] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    TEAM_TYPES.forEach(t => { init[t] = Array(24).fill(0); });
    return init;
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isCalendarViewOpen, setIsCalendarViewOpen] = useState(false);

  // Auth/edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordError, setEditPasswordError] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);

  // Save as structure dialog state
  const [saveStructureOpen, setSaveStructureOpen] = useState(false);
  const [structureName, setStructureName] = useState("");
  const [savingStructure, setSavingStructure] = useState(false);

  const { data: bases } = useBases();
  const { data: teamStructures } = useTeamStructures(selectedBaseId || null);
  const addTeamStructure = useAddTeamStructure();

  useMemo(() => {
    if (bases && bases.length > 0 && !selectedBaseId) {
      setSelectedBaseId(bases[0].id);
    }
  }, [bases, selectedBaseId]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: existingPlan, isLoading: planLoading } = useDailyTeamPlan(selectedBaseId || null, dateStr);
  const upsertPlan = useUpsertDailyTeamPlan();
  const deletePlan = useDeleteDailyTeamPlan();
  const upsertTypeEntries = useUpsertTeamTypeEntries();

  // Fetch type entries for existing plan
  const { data: typeEntries } = useTeamTypeEntries(existingPlan?.id ?? null);

  // Fetch all plans for calendar view
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const { data: monthPlans } = useDailyTeamPlans(selectedBaseId || null, monthStart, monthEnd);

  // Load existing plan
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

  // Load type entries
  useMemo(() => {
    const newTypeData: Record<string, number[]> = {};
    TEAM_TYPES.forEach(t => { newTypeData[t] = Array(24).fill(0); });
    if (typeEntries) {
      typeEntries.forEach(e => {
        if (newTypeData[e.team_type]) {
          newTypeData[e.team_type][e.hour] = e.quantity;
        }
      });
    }
    setTypeData(newTypeData);
  }, [typeEntries]);

  const handleTeamChange = (hour: number, value: number) => {
    setTeams(prev => { const n = [...prev]; n[hour] = value; return n; });
    setIsDirty(true);
  };

  const handleLossTeamChange = (hour: number, value: number) => {
    setLossTeams(prev => { const n = [...prev]; n[hour] = value; return n; });
    setIsDirty(true);
  };

  const handleTypeChange = (type: string, hour: number, value: number) => {
    setTypeData(prev => {
      const n = { ...prev, [type]: [...prev[type]] };
      n[type][hour] = value;
      return n;
    });
    setIsDirty(true);
  };

  const navigateDate = (dir: "prev" | "next") => {
    setSelectedDate(prev => addDays(prev, dir === "prev" ? -1 : 1));
  };

  const replicarParaTurno = (turnoIdx: number, sourceHour: number) => {
    const turno = TURNOS[turnoIdx];
    setTeams(prev => {
      const n = [...prev];
      turno.hours.forEach(h => { n[h] = prev[sourceHour]; });
      return n;
    });
    setLossTeams(prev => {
      const n = [...prev];
      turno.hours.forEach(h => { n[h] = prev[sourceHour]; });
      return n;
    });
    setTypeData(prev => {
      const n: Record<string, number[]> = {};
      Object.entries(prev).forEach(([type, arr]) => {
        n[type] = [...arr];
        turno.hours.forEach(h => { n[type][h] = arr[sourceHour]; });
      });
      return n;
    });
    setIsDirty(true);
    toast({ title: "Turno replicado", description: `Hora ${String(sourceHour).padStart(2, "0")}:00 replicada para ${turno.label}.` });
  };

  const apagarTurno = (turnoIdx: number) => {
    const turno = TURNOS[turnoIdx];
    setTeams(prev => { const n = [...prev]; turno.hours.forEach(h => { n[h] = 0; }); return n; });
    setLossTeams(prev => { const n = [...prev]; turno.hours.forEach(h => { n[h] = 0; }); return n; });
    setTypeData(prev => {
      const n: Record<string, number[]> = {};
      Object.entries(prev).forEach(([type, arr]) => {
        n[type] = [...arr];
        turno.hours.forEach(h => { n[type][h] = 0; });
      });
      return n;
    });
    setIsDirty(true);
    toast({ title: "Turno apagado", description: `Todos os valores do ${turno.label} foram zerados.` });
  };

  const copiarTipoParaTurno = (type: string, turnoIdx: number) => {
    const turno = TURNOS[turnoIdx];
    const sourceHour = turno.hours[0];
    setTypeData(prev => {
      const n = { ...prev, [type]: [...prev[type]] };
      turno.hours.forEach(h => { n[type][h] = prev[type][sourceHour]; });
      return n;
    });
    setIsDirty(true);
  };

  const apagarTipoNoTurno = (type: string, turnoIdx: number) => {
    const turno = TURNOS[turnoIdx];
    setTypeData(prev => {
      const n = { ...prev, [type]: [...prev[type]] };
      turno.hours.forEach(h => { n[type][h] = 0; });
      return n;
    });
    setIsDirty(true);
  };

  const saveSingleDay = async (date: Date) => {
    const ds = format(date, "yyyy-MM-dd");
    const planResult = await upsertPlan.mutateAsync({
      base_id: selectedBaseId,
      plan_date: ds,
      ...teamsArrayToPlanFields(teams, lossTeams),
    } as any);

    // Save type entries
    const planId = planResult?.id || existingPlan?.id;
    if (planId) {
      const entries: { team_type: string; hour: number; quantity: number }[] = [];
      TEAM_TYPES.forEach(type => {
        for (let h = 0; h < 24; h++) {
          if (typeData[type][h] > 0) {
            entries.push({ team_type: type, hour: h, quantity: typeData[type][h] });
          }
        }
      });
      await upsertTypeEntries.mutateAsync({ planId, entries });
    }
  };

  const handleSave = async () => {
    if (!selectedBaseId) return;
    try {
      if (planningMode === "single") {
        await saveSingleDay(selectedDate);
        toast({ title: "Plano salvo", description: `Equipes para ${format(selectedDate, "dd/MM/yyyy")} salvas.` });
      } else if (selectedEndDate) {
        const days = eachDayOfInterval({ start: selectedDate, end: selectedEndDate });
        for (const day of days) {
          await saveSingleDay(day);
        }
        toast({ title: "Período salvo", description: `Plano replicado para ${days.length} dias.` });
      }
      setIsDirty(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!existingPlan) return;
    try {
      await deletePlan.mutateAsync(existingPlan.id);
      setEditUnlocked(false);
      setEditDialogOpen(false);
      toast({ title: "Plano removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleEditPasswordSubmit = () => {
    if (editPassword === ADMIN_PASSWORD) {
      setEditUnlocked(true);
      setEditDialogOpen(false);
      setEditPassword("");
      setEditPasswordError(false);
      toast({ title: "Modo edição ativado", description: "Agora você pode apagar o plano." });
    } else {
      setEditPasswordError(true);
    }
  };

  const handleSaveAsStructure = async () => {
    if (!structureName.trim() || !selectedBaseId) return;
    setSavingStructure(true);
    try {
      // Build structure from current teams/lossTeams
      const structureFields: Record<string, number> = {};
      for (let h = 0; h < 24; h++) {
        structureFields[`teams_hour_${h}`] = teams[h] || 0;
        structureFields[`loss_teams_hour_${h}`] = lossTeams[h] || 0;
      }
      await addTeamStructure.mutateAsync({
        base_id: selectedBaseId,
        name: structureName.trim(),
        is_default: false,
        ...structureFields,
      } as any);
      toast({ title: "Estrutura salva", description: `"${structureName.trim()}" adicionada às estruturas padrão.` });
      setSaveStructureOpen(false);
      setStructureName("");
    } catch {
      toast({ title: "Erro ao salvar estrutura", variant: "destructive" });
    } finally {
      setSavingStructure(false);
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

  const plannedDates = useMemo(() => {
    if (!monthPlans) return new Set<string>();
    return new Set(monthPlans.map(p => p.plan_date));
  }, [monthPlans]);

  // BT only: Perdas, Corte e Religa, Reguladas
  const BT_ONLY_TYPES = ["Perdas", "Corte e Religa", "Reguladas"] as const;
  // Excluded from calculations: LV and MK
  const EXCLUDED_TYPES = ["LV Manutenção", "LV Obras", "MK Manutenção", "MK Obras"] as const;
  // Apoio types count for all incidents (not excluded, not BT only)
  // "Apoio UTS" and "Apoio UTN" are automatically included in totalAllIncidents since they're not in EXCLUDED or BT_ONLY

  const totalAllIncidents = TEAM_TYPES
    .filter(t => !EXCLUDED_TYPES.includes(t as any) && !BT_ONLY_TYPES.includes(t as any))
    .reduce((s, t) => s + (typeData[t]?.reduce((a, b) => a + b, 0) ?? 0), 0);
  const totalBT = BT_ONLY_TYPES.reduce((s, t) => s + (typeData[t]?.reduce((a, b) => a + b, 0) ?? 0), 0);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 pl-16">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Planejamento de Equipes</h1>
          <p className="text-sm text-muted-foreground">Defina a quantidade de equipes por tipo e hora para dias específicos</p>
        </div>

        {/* Controls */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            {/* Base */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Base</label>
              <Select value={selectedBaseId} onValueChange={setSelectedBaseId}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Base" /></SelectTrigger>
                <SelectContent>
                  {bases?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Mode toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Modo</label>
              <div className="flex gap-1">
                <Button size="sm" variant={planningMode === "single" ? "default" : "outline"} onClick={() => setPlanningMode("single")} className="text-xs h-8">Dia</Button>
                <Button size="sm" variant={planningMode === "period" ? "default" : "outline"} onClick={() => setPlanningMode("period")} className="text-xs h-8">Período</Button>
              </div>
            </div>

            {/* Date navigation */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{planningMode === "period" ? "Data início" : "Data"}</label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("prev")}><ChevronLeft className="h-4 w-4" /></Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] h-8 justify-start text-left font-normal text-xs">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
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

            {/* End date for period mode */}
            {planningMode === "period" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data fim</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] h-8 justify-start text-left font-normal text-xs">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {selectedEndDate ? format(selectedEndDate, "dd/MM/yyyy") : "Selecionar..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedEndDate} onSelect={(d) => d && setSelectedEndDate(d)} locale={ptBR} disabled={(d) => d < selectedDate} className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Calendar view dialog */}
            <Dialog open={isCalendarViewOpen} onOpenChange={setIsCalendarViewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Planejados</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dias planejados - {format(selectedDate, "MMMM yyyy", { locale: ptBR })}</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setIsCalendarViewOpen(false); } }}
                  locale={ptBR}
                  month={selectedDate}
                  modifiers={{ planned: (d) => plannedDates.has(format(d, "yyyy-MM-dd")) }}
                  modifiersClassNames={{ planned: "bg-primary/20 text-primary font-bold" }}
                  className={cn("p-3 pointer-events-auto")}
                />
                <p className="text-xs text-muted-foreground">{plannedDates.size} dia(s) planejado(s) neste mês</p>
              </DialogContent>
            </Dialog>

            {/* Copy from structure */}
            {teamStructures && teamStructures.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Copiar estrutura</label>
                <Select onValueChange={handleCopyFromStructure}>
                  <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {teamStructures.map(s => (
                      <SelectItem key={s.id} value={s.id}><Copy className="w-3 h-3 inline mr-1" />{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
              {existingPlan && !editUnlocked && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditDialogOpen(true); setEditPassword(""); setEditPasswordError(false); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Editar
                </Button>
              )}
              {existingPlan && editUnlocked && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => setEditUnlocked(false)}>
                  <X className="w-3.5 h-3.5 mr-1" />Cancelar
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setStructureName(""); setSaveStructureOpen(true); }}>
                <BookmarkPlus className="w-3.5 h-3.5 mr-1" />Salvar Padrão
              </Button>
              <Button onClick={handleSave} disabled={(!isDirty || upsertPlan.isPending) || (!!existingPlan && !editUnlocked)} size="sm" className="h-8">
                {upsertPlan.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Salvar {planningMode === "period" ? "Período" : "Dia"}
              </Button>
            </div>

          </div>

          {/* Edit password dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Autenticação necessária</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Digite a senha para habilitar o modo de edição.</p>
              <Input
                type="password"
                placeholder="Senha"
                value={editPassword}
                onChange={e => { setEditPassword(e.target.value); setEditPasswordError(false); }}
                onKeyDown={e => e.key === "Enter" && handleEditPasswordSubmit()}
                className={editPasswordError ? "border-destructive" : ""}
                autoFocus
              />
              {editPasswordError && <p className="text-xs text-destructive">Senha incorreta.</p>}
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleEditPasswordSubmit}>Confirmar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Save as structure dialog */}
          <Dialog open={saveStructureOpen} onOpenChange={setSaveStructureOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Salvar como Estrutura Padrão</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Esta estrutura será adicionada à lista de estruturas padrão da base selecionada.</p>
              <Input
                placeholder="Nome da estrutura..."
                value={structureName}
                onChange={e => setStructureName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveAsStructure()}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setSaveStructureOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveAsStructure} disabled={!structureName.trim() || savingStructure}>
                  {savingStructure ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5 mr-1" />}
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>


          {/* Summary */}
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span>Equipes Totais (Dia): <strong className="text-foreground">{(totalAllIncidents / 24).toFixed(1)} eq/h</strong></span>
            <span>Equipes BT (Dia): <strong className="text-orange-400">{(totalBT / 24).toFixed(1)} eq/h</strong></span>
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
            {TURNOS.map((turno, turnoIdx) => {
              const turnoColors = [
                { badge: "text-blue-400 bg-blue-500/10 border border-blue-500/30", text: "text-blue-400", icon: "text-blue-400", cardBorder: "border border-blue-500/30" },
                { badge: "text-amber-400 bg-amber-500/10 border border-amber-500/30", text: "text-amber-400", icon: "text-amber-400", cardBorder: "border border-amber-500/30" },
                { badge: "text-purple-400 bg-purple-500/10 border border-purple-500/30", text: "text-purple-400", icon: "text-purple-400", cardBorder: "border border-purple-500/30" },
              ][turnoIdx];

              const turnoAllIncidents = TEAM_TYPES
                .filter(t => !EXCLUDED_TYPES.includes(t as any) && !BT_ONLY_TYPES.includes(t as any))
                .reduce((s, t) => s + turno.hours.reduce((a, h) => a + (typeData[t]?.[h] ?? 0), 0), 0);
              const turnoBT = BT_ONLY_TYPES.reduce((s, t) => s + turno.hours.reduce((a, h) => a + (typeData[t]?.[h] ?? 0), 0), 0);
              const hoursCount = turno.hours.length;

              const isLocked = !!existingPlan && !editUnlocked;

              return (
                <div key={turno.letter} className={`glass-card p-4 ${turnoColors.cardBorder}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${turnoColors.badge}`}>
                        TURNO {turno.letter}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {String(turno.hours[0]).padStart(2, "0")}h – {String(turno.hours[turno.hours.length - 1]).padStart(2, "0")}h
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-xs h-7 ${turnoColors.icon}`}
                        onClick={() => replicarParaTurno(turnoIdx, turno.hours[0])}
                        title={`Replicar hora ${String(turno.hours[0]).padStart(2, "0")} para todo o turno`}
                        disabled={isLocked}
                      >
                        <Copy className="w-3 h-3 mr-1" />Replicar 1ª hora
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-xs h-7 ${turnoColors.icon} hover:bg-muted/40`}
                        onClick={() => apagarTurno(turnoIdx)}
                        title="Apagar todos os valores do turno"
                        disabled={isLocked}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />Apagar Turno
                      </Button>
                    </div>
                  </div>

                  {/* Scrollable horizontal grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left py-1 pr-2 text-muted-foreground font-medium sticky left-0 bg-card z-10 min-w-[120px]">Tipo</th>
                          {turno.hours.map(h => (
                            <th key={h} className={`text-center py-1 px-1 font-mono min-w-[56px] ${turnoColors.text}`}>
                              {String(h).padStart(2, "0")}h
                            </th>
                          ))}
                          <th className="py-1 pl-1 w-[52px]"></th>
                         </tr>
                      </thead>
                      <tbody>
                        {TEAM_TYPES.map((type, typeIdx) => {
                          const isBTOnly = BT_ONLY_TYPES.includes(type as any);
                          const isExcluded = EXCLUDED_TYPES.includes(type as any);
                          return (
                            <tr key={type} className={`hover:bg-muted/30 ${typeIdx === 0 ? "border-t border-border" : ""}`}>
                              <td className={`py-1 pr-2 sticky left-0 bg-card z-10 truncate text-xs ${isBTOnly ? "text-orange-400" : "text-foreground"}`} title={type}>
                                {type}
                                {isBTOnly && <span className="ml-1 text-[10px] text-orange-400/60">BT</span>}
                              </td>
                               {turno.hours.map(h => (
                                 <td key={h} className="py-1 px-0.5">
                                   <Input
                                     type="number"
                                     min={0}
                                     value={typeData[type]?.[h] ?? 0}
                                     onChange={(e) => handleTypeChange(type, h, parseInt(e.target.value) || 0)}
                                     className={`h-7 text-center text-xs font-mono w-full ${isBTOnly ? "border-orange-500/30" : ""}`}
                                     disabled={isLocked}
                                     readOnly={isLocked}
                                   />
                                 </td>
                               ))}
                               <td className="py-1 pl-1">
                                 <div className="flex gap-0.5">
                                   <Button
                                     variant="ghost"
                                     size="icon"
                                     className={`h-7 w-6 ${turnoColors.icon} hover:bg-muted/40`}
                                     title={`Copiar 1ª hora de ${type} para todo o turno`}
                                     onClick={() => copiarTipoParaTurno(type, turnoIdx)}
                                     disabled={isLocked}
                                   >
                                     <Copy className="w-3 h-3" />
                                   </Button>
                                   <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-6 ${turnoColors.icon} hover:bg-muted/40`}
                                      title={`Apagar ${type} neste turno`}
                                      onClick={() => apagarTipoNoTurno(type, turnoIdx)}
                                      disabled={isLocked}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                 </div>
                               </td>
                             </tr>
                           );
                         })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>Equipes Totais: <strong className="text-foreground">{(turnoAllIncidents / hoursCount).toFixed(1)} eq/h</strong></span>
                    <span>Equipes BT: <strong className="text-orange-400">{(turnoBT / hoursCount).toFixed(1)} eq/h</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default Estrutura;
