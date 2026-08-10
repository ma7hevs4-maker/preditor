import { useState, useMemo, useCallback, useRef } from "react";
import { format, addDays, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save, Loader2, Copy, Trash2, ChevronLeft, ChevronRight, CalendarDays, X, Pencil, BookmarkPlus, Download, Upload, ClipboardPaste, History, ClipboardList, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBases } from "@/hooks/useBases";
import { useTeamStructures, structureToTeamsArray, structureToLossTeamsArray, useAddTeamStructure } from "@/hooks/useTeamStructures";
import { useDailyTeamPlan, useUpsertDailyTeamPlan, useDeleteDailyTeamPlan, useDailyTeamPlans, planToTeamsArray, planToLossTeamsArray, teamsArrayToPlanFields, PlanKind } from "@/hooks/useDailyTeamPlans";
import { useTeamTypeEntries, entriesToMap, useUpsertTeamTypeEntries } from "@/hooks/useTeamTypeEntries";
import { usePlanChangeLogs, useAddPlanChangeLog, diffTypeData, PlanChangeDetail, useAllPlanChangeLogs } from "@/hooks/usePlanChangeLogs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TEAM_TYPES, TURNOS } from "@/data/teamTypes";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const ADMIN_PASSWORD = "dys";

const SHORT_NAMES: Record<string, string> = {
  "Emergência": "Emerg.",
  "Gestores": "Gest.",
  "Cesto Manutenção": "Cesto Man.",
  "Cesto Obras": "Cesto Obr.",
  "LV Manutenção": "LV Man.",
  "LV Obras": "LV Obr.",
  "MK Manutenção": "MK Man.",
  "MK Obras": "MK Obr.",
  "Apoio UTS": "Ap. UTS",
  "Apoio UTN": "Ap. UTN",
  "Corte e Religa": "Corte/Rel.",
  "Reguladas": "Regul.",
};

const StructurePlanner = ({ kind }: { kind: PlanKind }) => {
  const isRealizado = kind === "realizado";
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>();
  const [planningMode, setPlanningMode] = useState<"single" | "period">("single");
  const [teams, setTeams] = useState<number[]>(Array(24).fill(0));
  const [lossTeams, setLossTeams] = useState<number[]>(Array(24).fill(0));
  const [typeData, setTypeData] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    TEAM_TYPES.forEach(t => { init[t] = Array(24).fill(0); });
    return init;
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isCalendarViewOpen, setIsCalendarViewOpen] = useState(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(new Date());

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordError, setEditPasswordError] = useState(false);
  const [editUnlocked, setEditUnlocked] = useState(false);

  const [saveStructureOpen, setSaveStructureOpen] = useState(false);
  const [structureName, setStructureName] = useState("");
  const [savingStructure, setSavingStructure] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logAuthor, setLogAuthor] = useState("");
  const [authorDialogOpen, setAuthorDialogOpen] = useState(false);
  const [authorInput, setAuthorInput] = useState("");
  const [authorError, setAuthorError] = useState(false);
  const [logUnlocked, setLogUnlocked] = useState(false);
  const [logPasswordOpen, setLogPasswordOpen] = useState(false);
  const [logPassword, setLogPassword] = useState("");
  const [logPasswordError, setLogPasswordError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedTypeDataRef = useRef<Record<string, number[]>>({});

  const { data: bases } = useBases();
  const { data: teamStructures } = useTeamStructures(selectedBaseId || null);
  const addTeamStructure = useAddTeamStructure();

  useMemo(() => {
    if (bases && bases.length > 0 && !selectedBaseId) {
      setSelectedBaseId(bases[0].id);
    }
  }, [bases, selectedBaseId]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: existingPlan, isLoading: planLoading } = useDailyTeamPlan(selectedBaseId || null, dateStr, kind);
  const upsertPlan = useUpsertDailyTeamPlan();
  const deletePlan = useDeleteDailyTeamPlan();
  const upsertTypeEntries = useUpsertTeamTypeEntries();
  const addChangeLog = useAddPlanChangeLog();
  const { data: changeLogs } = usePlanChangeLogs(isRealizado ? selectedBaseId || null : null, null, "realizado");

  const { data: typeEntries } = useTeamTypeEntries(existingPlan?.id ?? null);

  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const { data: monthPlans } = useDailyTeamPlans(selectedBaseId || null, monthStart, monthEnd, kind);

  const calendarViewMonthStart = format(startOfMonth(calendarViewMonth), "yyyy-MM-dd");
  const calendarViewMonthEnd = format(endOfMonth(calendarViewMonth), "yyyy-MM-dd");
  const { data: calendarViewMonthPlans } = useDailyTeamPlans(selectedBaseId || null, calendarViewMonthStart, calendarViewMonthEnd, kind);

  const calendarPlannedDates = useMemo(() => {
    if (!calendarViewMonthPlans) return new Set<string>();
    return new Set(calendarViewMonthPlans.map(p => p.plan_date));
  }, [calendarViewMonthPlans]);

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
    savedTypeDataRef.current = newTypeData;
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
      plan_kind: kind,
      ...teamsArrayToPlanFields(teams, lossTeams),
    } as any);

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

  const handleSave = async (authorName?: string) => {
    if (!selectedBaseId) return;
    const author = (authorName ?? logAuthor).trim() || null;
    try {
      const changes: PlanChangeDetail[] = diffTypeData(savedTypeDataRef.current, typeData);
      if (planningMode === "single") {
        await saveSingleDay(selectedDate);
        if (isRealizado) {
          await addChangeLog.mutateAsync({
            base_id: selectedBaseId,
            plan_date: format(selectedDate, "yyyy-MM-dd"),
            action: existingPlan ? "update" : "create",
            author,
            note: null,
            changes,
          });
        }
        toast({ title: "Plano salvo", description: `Equipes para ${format(selectedDate, "dd/MM/yyyy")} salvas.` });
      } else if (selectedEndDate) {
        const days = eachDayOfInterval({ start: selectedDate, end: selectedEndDate });
        for (const day of days) {
          await saveSingleDay(day);
          if (isRealizado) {
            await addChangeLog.mutateAsync({
              base_id: selectedBaseId,
              plan_date: format(day, "yyyy-MM-dd"),
              action: "update",
              author,
              note: null,
              changes,
            });
          }
        }
        toast({ title: "Período salvo", description: `Plano replicado para ${days.length} dias.` });
      }
      savedTypeDataRef.current = typeData;
      setIsDirty(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleAuthorConfirm = async () => {
    const name = authorInput.trim();
    if (!name) { setAuthorError(true); return; }
    setLogAuthor(name);
    setAuthorDialogOpen(false);
    setAuthorError(false);
    await handleSave(name);
  };

  const handleLogPasswordSubmit = () => {
    if (logPassword === ADMIN_PASSWORD) {
      setLogUnlocked(true);
      setLogPasswordOpen(false);
      setLogPassword("");
      setLogPasswordError(false);
      setLogOpen(true);
    } else {
      setLogPasswordError(true);
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
      toast({ title: "Modo edição ativado", description: "Agora você pode editar o plano." });
    } else {
      setEditPasswordError(true);
    }
  };

  const handleSaveAsStructure = async () => {
    if (!structureName.trim() || !selectedBaseId) return;
    setSavingStructure(true);
    try {
      const structureFields: Record<string, any> = {};
      for (let h = 0; h < 24; h++) {
        const totalHour = TEAM_TYPES.reduce((sum, type) => sum + (typeData[type]?.[h] ?? 0), 0);
        const perdasHour = typeData["Perdas"]?.[h] ?? 0;
        structureFields[`teams_hour_${h}`] = totalHour;
        structureFields[`loss_teams_hour_${h}`] = perdasHour;
      }
      structureFields.type_data_snapshot = typeData;
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

    const snapshot = (structure as any).type_data_snapshot as Record<string, number[]> | null;
    if (snapshot) {
      const newTypeData: Record<string, number[]> = {};
      TEAM_TYPES.forEach(t => {
        const values = snapshot[t];
        newTypeData[t] = Array.isArray(values)
          ? Array.from({ length: 24 }, (_, h) => Number(values[h] ?? 0))
          : Array(24).fill(0);
      });
      setTypeData(newTypeData);
    } else {
      const fallbackTypeData: Record<string, number[]> = {};
      TEAM_TYPES.forEach(t => { fallbackTypeData[t] = Array(24).fill(0); });

      const emergencyKey = TEAM_TYPES.includes("Emergência") ? "Emergência" : TEAM_TYPES[0];
      const perdasKey = TEAM_TYPES.includes("Perdas") ? "Perdas" : null;

      for (let h = 0; h < 24; h++) {
        const total = Number((structure as any)[`teams_hour_${h}`] ?? 0);
        const perdas = Number((structure as any)[`loss_teams_hour_${h}`] ?? 0);
        const apoio = Math.max(total - perdas, 0);
        fallbackTypeData[emergencyKey][h] = apoio;
        if (perdasKey) fallbackTypeData[perdasKey][h] = Math.max(perdas, 0);
      }

      setTypeData(fallbackTypeData);
      toast({
        title: "Estrutura legada copiada",
        description: "Sem detalhamento por tipo salvo. Aplicado fallback automático (Emergência/Perdas).",
      });
    }

    setIsDirty(true);
    toast({ title: "Estrutura copiada", description: `"${structure.name}" aplicada.` });
  };

  const plannedDates = useMemo(() => {
    if (!monthPlans) return new Set<string>();
    return new Set(monthPlans.map(p => p.plan_date));
  }, [monthPlans]);

  const BT_ONLY_TYPES = ["Perdas", "Corte e Religa"] as const;
  const EXCLUDED_TYPES = ["LV Manutenção", "LV Obras", "MK Manutenção", "MK Obras", "Reguladas"] as const;

  const totalAllIncidents = TEAM_TYPES
    .filter(t => !EXCLUDED_TYPES.includes(t as any) && !BT_ONLY_TYPES.includes(t as any))
    .reduce((s, t) => s + (typeData[t]?.reduce((a, b) => a + b, 0) ?? 0), 0);
  const totalBT = BT_ONLY_TYPES.reduce((s, t) => s + (typeData[t]?.reduce((a, b) => a + b, 0) ?? 0), 0);

  // ── Excel template download ──
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ["Tipo de Equipe", ...Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}h`)];
    const rows = TEAM_TYPES.map(type => {
      const row: (string | number)[] = [type];
      for (let h = 0; h < 24; h++) row.push(typeData[type]?.[h] ?? 0);
      return row;
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 20 }, ...Array(24).fill({ wch: 6 })];
    XLSX.utils.book_append_sheet(wb, ws, "Estrutura");
    const baseName = bases?.find(b => b.id === selectedBaseId)?.name ?? "base";
    XLSX.writeFile(wb, `Estrutura_${baseName}_${format(selectedDate, "yyyy-MM-dd")}.xlsx`);
  };

  // ── Excel upload ──
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length < 2) {
          toast({ title: "Arquivo vazio", variant: "destructive" });
          return;
        }

        const newTypeData: Record<string, number[]> = {};
        TEAM_TYPES.forEach(t => { newTypeData[t] = Array(24).fill(0); });

        // Skip header row (index 0)
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const typeName = String(row[0] ?? "").trim();
          if (!typeName) continue;
          const matched = TEAM_TYPES.find(t => t.toLowerCase() === typeName.toLowerCase());
          if (!matched) continue;
          for (let h = 0; h < 24; h++) {
            newTypeData[matched][h] = Math.max(0, parseInt(String(row[h + 1] ?? 0)) || 0);
          }
        }

        setTypeData(newTypeData);

        // Recalculate totals for teams/lossTeams arrays
        const newTeams = Array(24).fill(0);
        const newLoss = Array(24).fill(0);
        for (let h = 0; h < 24; h++) {
          newTeams[h] = TEAM_TYPES.reduce((s, t) => s + (newTypeData[t]?.[h] ?? 0), 0);
          newLoss[h] = newTypeData["Perdas"]?.[h] ?? 0;
        }
        setTeams(newTeams);
        setLossTeams(newLoss);
        setIsDirty(true);

        toast({ title: "Estrutura importada", description: `Dados carregados de "${file.name}".` });
      } catch {
        toast({ title: "Erro ao ler arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Clipboard paste (Ctrl+C from Excel) ──
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ title: "Clipboard vazio", description: "Copie os dados da planilha primeiro (Ctrl+C).", variant: "destructive" });
        return;
      }

      const lines = text.trim().split("\n").map(line => line.split("\t"));
      if (lines.length < 2) {
        toast({ title: "Formato inválido", description: "Esperado: tabela com tipo de equipe na 1ª coluna e valores por hora nas demais.", variant: "destructive" });
        return;
      }

      const newTypeData: Record<string, number[]> = {};
      TEAM_TYPES.forEach(t => { newTypeData[t] = Array(24).fill(0); });

      // Detect if first row is header (check if 2nd cell is a number)
      const firstRowSecondCell = parseFloat(lines[0][1]);
      const startRow = isNaN(firstRowSecondCell) ? 1 : 0;

      let matchCount = 0;
      for (let r = startRow; r < lines.length; r++) {
        const cells = lines[r];
        const typeName = (cells[0] ?? "").trim();
        if (!typeName) continue;

        // Match by full name or short name
        const matched = TEAM_TYPES.find(t => {
          const tLower = t.toLowerCase();
          const inputLower = typeName.toLowerCase();
          const shortLower = (SHORT_NAMES[t] ?? "").toLowerCase();
          return tLower === inputLower || shortLower === inputLower || tLower.startsWith(inputLower) || inputLower.startsWith(tLower);
        });

        if (!matched) continue;
        matchCount++;
        for (let h = 0; h < 24 && h + 1 < cells.length; h++) {
          newTypeData[matched][h] = Math.max(0, parseInt(cells[h + 1]) || 0);
        }
      }

      if (matchCount === 0) {
        toast({ title: "Nenhum tipo reconhecido", description: "Verifique se a 1ª coluna contém os nomes dos tipos de equipe.", variant: "destructive" });
        return;
      }

      setTypeData(newTypeData);
      const newTeams = Array(24).fill(0);
      const newLoss = Array(24).fill(0);
      for (let h = 0; h < 24; h++) {
        newTeams[h] = TEAM_TYPES.reduce((s, t) => s + (newTypeData[t]?.[h] ?? 0), 0);
        newLoss[h] = newTypeData["Perdas"]?.[h] ?? 0;
      }
      setTeams(newTeams);
      setLossTeams(newLoss);
      setIsDirty(true);

      toast({ title: "Dados colados!", description: `${matchCount} tipo(s) de equipe importado(s) do clipboard.` });
    } catch (err) {
      toast({ title: "Erro ao colar", description: "Permita o acesso ao clipboard ou use Ctrl+V.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6 pl-16">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            {isRealizado ? "Estrutura Realizada" : "Estrutura Planejada"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRealizado
              ? "Registre a estrutura que realmente operou por tipo e hora — edição liberada, com log de alterações"
              : "Defina a quantidade de equipes por tipo e hora para dias específicos"}
          </p>
        </div>

        {/* Controls */}
        <div className="glass-card p-4 mb-4">
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
            <Dialog open={isCalendarViewOpen} onOpenChange={(open) => { setIsCalendarViewOpen(open); if (open) setCalendarViewMonth(selectedDate); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Planejados</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dias planejados - {format(calendarViewMonth, "MMMM yyyy", { locale: ptBR })}</DialogTitle>
                </DialogHeader>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setIsCalendarViewOpen(false); } }}
                  locale={ptBR}
                  month={calendarViewMonth}
                  onMonthChange={setCalendarViewMonth}
                  modifiers={{ planned: (d) => calendarPlannedDates.has(format(d, "yyyy-MM-dd")) }}
                  modifiersClassNames={{ planned: "bg-primary/20 text-primary font-bold" }}
                  className={cn("p-3 pointer-events-auto")}
                />
                <p className="text-xs text-muted-foreground">{calendarPlannedDates.size} dia(s) planejado(s) neste mês</p>
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

            {/* Excel Import/Export/Paste */}
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleDownloadTemplate} title="Baixar modelo Excel com os dados atuais">
                <Download className="w-3.5 h-3.5 mr-1" />Modelo
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} title="Importar estrutura de um arquivo Excel">
                <Upload className="w-3.5 h-3.5 mr-1" />Importar
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs bg-primary/10 hover:bg-primary/20 border-primary/30" onClick={handlePasteFromClipboard} title="Colar dados copiados da planilha (Ctrl+C no Excel → clique aqui)">
                <ClipboardPaste className="w-3.5 h-3.5 mr-1" />Colar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleUploadExcel}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
              {isRealizado && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => {
                  if (logUnlocked) { setLogOpen(true); }
                  else { setLogPassword(""); setLogPasswordError(false); setLogPasswordOpen(true); }
                }}>
                  <History className="w-3.5 h-3.5 mr-1" />Log
                </Button>
              )}
              {!isRealizado && existingPlan && !editUnlocked && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditDialogOpen(true); setEditPassword(""); setEditPasswordError(false); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />Editar
                </Button>
              )}
              {!isRealizado && existingPlan && editUnlocked && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => setEditUnlocked(false)}>
                  <X className="w-3.5 h-3.5 mr-1" />Cancelar
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setStructureName(""); setSaveStructureOpen(true); }}>
                <BookmarkPlus className="w-3.5 h-3.5 mr-1" />Salvar Padrão
              </Button>
              <Button
                onClick={() => {
                  if (isRealizado) {
                    setAuthorInput(logAuthor);
                    setAuthorError(false);
                    setAuthorDialogOpen(true);
                  } else {
                    handleSave();
                  }
                }}
                disabled={(!isDirty || upsertPlan.isPending) || (!isRealizado && !!existingPlan && !editUnlocked)}
                size="sm"
                className="h-8"
              >
                {upsertPlan.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Salvar {planningMode === "period" ? "Período" : "Dia"}
              </Button>
            </div>
          </div>

          {/* Author dialog before saving a realizado plan */}
          <Dialog open={authorDialogOpen} onOpenChange={setAuthorDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Quem está salvando?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Informe o nome do autor da edição para registrar no log.</p>
              <Input
                placeholder="Nome do autor"
                value={authorInput}
                onChange={e => { setAuthorInput(e.target.value); setAuthorError(false); }}
                onKeyDown={e => e.key === "Enter" && handleAuthorConfirm()}
                className={authorError ? "border-destructive" : ""}
                autoFocus
              />
              {authorError && <p className="text-xs text-destructive">Informe o nome do autor.</p>}
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setAuthorDialogOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAuthorConfirm} disabled={upsertPlan.isPending}>
                  {upsertPlan.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Log password dialog */}
          <Dialog open={logPasswordOpen} onOpenChange={setLogPasswordOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Autenticação necessária</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Digite a senha para visualizar o log de alterações.</p>
              <Input
                type="password"
                placeholder="Senha"
                value={logPassword}
                onChange={e => { setLogPassword(e.target.value); setLogPasswordError(false); }}
                onKeyDown={e => e.key === "Enter" && handleLogPasswordSubmit()}
                className={logPasswordError ? "border-destructive" : ""}
                autoFocus
              />
              {logPasswordError && <p className="text-xs text-destructive">Senha incorreta.</p>}
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setLogPasswordOpen(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleLogPasswordSubmit}>Confirmar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Change log dialog */}
          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Log de alterações — {bases?.find(b => b.id === selectedBaseId)?.name ?? "base"}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-3">
                {!changeLogs || changeLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma alteração registrada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {changeLogs.map(log => {
                      const details = Array.isArray(log.changes) ? (log.changes as PlanChangeDetail[]) : [];
                      return (
                        <div key={log.id} className="rounded-lg border border-border/50 p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                              {format(new Date(log.plan_date + "T00:00:00"), "dd/MM/yyyy")}
                              <span className="text-muted-foreground font-normal">
                                · {log.action === "create" ? "criação" : "edição"}
                              </span>
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                              {log.author ? ` · ${log.author}` : ""}
                            </span>
                          </div>
                          {log.note && <p className="text-xs text-muted-foreground mt-1">{log.note}</p>}
                          {details.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {details.slice(0, 40).map((d, i) => (
                                <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-foreground">
                                  {SHORT_NAMES[d.type] ?? d.type} {String(d.hour).padStart(2, "0")}h: {d.from}→{d.to}
                                </span>
                              ))}
                              {details.length > 40 && (
                                <span className="text-[10px] text-muted-foreground">+{details.length - 40} alterações</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

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

        {/* Hourly Grid - 3 Turnos side by side */}
        {planLoading ? (
          <div className="glass-card p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span>Carregando plano...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
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

              const isLocked = !isRealizado && !!existingPlan && !editUnlocked;

              return (
                <div key={turno.letter} className={`glass-card p-3 ${turnoColors.cardBorder}`}>
                  {/* Turno header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${turnoColors.badge}`}>
                        TURNO {turno.letter}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {String(turno.hours[0]).padStart(2, "0")}h – {String(turno.hours[turno.hours.length - 1]).padStart(2, "0")}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-[10px] h-6 px-1.5 ${turnoColors.icon}`}
                        onClick={() => replicarParaTurno(turnoIdx, turno.hours[0])}
                        title={`Replicar hora ${String(turno.hours[0]).padStart(2, "0")} para todo o turno`}
                        disabled={isLocked}
                      >
                        <Copy className="w-3 h-3 mr-0.5" />Replicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-[10px] h-6 px-1.5 ${turnoColors.icon} hover:bg-muted/40`}
                        onClick={() => apagarTurno(turnoIdx)}
                        title="Apagar todos os valores do turno"
                        disabled={isLocked}
                      >
                        <Trash2 className="w-3 h-3 mr-0.5" />Apagar
                      </Button>
                    </div>
                  </div>

                  {/* Fixed grid - no horizontal scroll */}
                  <div className="overflow-hidden">
                    <table className="w-full text-[11px] table-fixed">
                      <thead>
                        <tr>
                          <th className="text-left py-0.5 pr-1 text-muted-foreground font-medium w-[72px]">Tipo</th>
                          {turno.hours.map(h => (
                            <th key={h} className={`text-center py-0.5 font-mono ${turnoColors.text}`}>
                              {String(h).padStart(2, "0")}
                            </th>
                          ))}
                          <th className="py-0.5 w-[36px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {TEAM_TYPES.map((type, typeIdx) => {
                          const isBTOnly = BT_ONLY_TYPES.includes(type as any);
                          return (
                            <tr key={type} className={`hover:bg-muted/30 ${typeIdx === 0 ? "border-t border-border" : ""}`}>
                              <td className={`py-0.5 pr-1 truncate text-[10px] whitespace-nowrap ${isBTOnly ? "text-orange-400" : "text-foreground"}`} title={type}>
                                {SHORT_NAMES[type] ?? type}
                              </td>
                              {turno.hours.map(h => (
                                <td key={h} className="py-0.5 px-px">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={typeData[type]?.[h] ?? 0}
                                    onChange={(e) => handleTypeChange(type, h, parseInt(e.target.value) || 0)}
                                    className={`h-5 text-center text-[10px] font-mono w-full p-0 ${isBTOnly ? "border-orange-500/30" : ""}`}
                                    disabled={isLocked}
                                    readOnly={isLocked}
                                  />
                                </td>
                              ))}
                              <td className="py-0.5">
                                <div className="flex gap-0 justify-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-5 w-4 ${turnoColors.icon} hover:bg-muted/40`}
                                    title={`Copiar 1ª hora de ${type}`}
                                    onClick={() => copiarTipoParaTurno(type, turnoIdx)}
                                    disabled={isLocked}
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-5 w-4 ${turnoColors.icon} hover:bg-muted/40`}
                                    title={`Apagar ${type}`}
                                    onClick={() => apagarTipoNoTurno(type, turnoIdx)}
                                    disabled={isLocked}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                    <span>eq/h: <strong className="text-foreground">{(turnoAllIncidents / hoursCount).toFixed(1)}</strong></span>
                    <span>BT: <strong className="text-orange-400">{(turnoBT / hoursCount).toFixed(1)}</strong></span>
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

const Estrutura = () => {
  const [tab, setTab] = useState<PlanKind>("planejado");

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={tab} onValueChange={v => setTab(v as PlanKind)} className="w-full">
        <div className="px-4 lg:px-6 pl-16 pt-4">
          <TabsList>
            <TabsTrigger value="planejado">Estrutura Planejada</TabsTrigger>
            <TabsTrigger value="realizado">Estrutura Realizada</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="planejado" className="mt-0">
          <StructurePlanner kind="planejado" />
        </TabsContent>
        <TabsContent value="realizado" className="mt-0">
          <StructurePlanner kind="realizado" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Estrutura;
