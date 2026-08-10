import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Play, RotateCcw, Users, Copy, Trash2, Download, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBases } from "@/hooks/useBases";
import { useTeamStructures, structureToTeamsArray, structureToLossTeamsArray } from "@/hooks/useTeamStructures";

import { SimulationConfig } from "@/hooks/useSimulation";
import { REGIONAIS, getBaseIdsForRegional, getPrimaryBaseId } from "@/data/basesConfig";
import { toast } from "@/hooks/use-toast";

interface ConfigurationFormProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
  onCalculate: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

const defaultTeamsPerHour = [
  0, 0, 0, 0, 0, 0, 0, 0, // Turno A (0-7h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno B (8-15h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno C (16-23h)
];

const defaultLossTeamsPerHour = [
  0, 0, 0, 0, 0, 0, 0, 0, // Turno A (0-7h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno B (8-15h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno C (16-23h)
];

const turnos = [
  { id: "A", name: "Turno A", hours: "00h - 07h", range: [0, 1, 2, 3, 4, 5, 6, 7], colorClass: "text-blue-400 border-blue-500/30" },
  { id: "B", name: "Turno B", hours: "08h - 15h", range: [8, 9, 10, 11, 12, 13, 14, 15], colorClass: "text-amber-400 border-amber-500/30" },
  { id: "C", name: "Turno C", hours: "16h - 23h", range: [16, 17, 18, 19, 20, 21, 22, 23], colorClass: "text-purple-400 border-purple-500/30" },
];

export const ConfigurationForm = ({
  config,
  onConfigChange,
  onCalculate,
  onSave,
  isSaving,
}: ConfigurationFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<SimulationConfig>(config);
  const [selectedRegionalLabel, setSelectedRegionalLabel] = useState<string>("");
  const [selectedSucursal, setSelectedSucursal] = useState<string>("todas");
  const [locationSucursal, setLocationSucursal] = useState<string>("");
  const [declaredDateOpen, setDeclaredDateOpen] = useState(false);
  const [declaredDate, setDeclaredDate] = useState<Date>(new Date());
  const [loadingDeclared, setLoadingDeclared] = useState(false);
  const { data: bases, isLoading: basesLoading } = useBases();
  const { data: teamStructures } = useTeamStructures(localConfig.baseId || null);

  // Find the selected regional config
  const selectedRegional = REGIONAIS.find((r) => r.label === selectedRegionalLabel);
  const hasSucursais = (selectedRegional?.sucursais.length ?? 0) > 0;

  // Get the base IDs to fetch declared plans for (considering sucursal selection)
  const declaredBaseIds = useMemo(() => {
    if (!selectedRegional || !bases) return [];
    return getBaseIdsForRegional(selectedRegional.label, bases, hasSucursais ? selectedSucursal : null);
  }, [selectedRegional, bases, selectedSucursal, hasSucursais]);

  // Fetch daily plans for the declared date and relevant base IDs
  const declaredDateStr = format(declaredDate, "yyyy-MM-dd");

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // When regional changes, update baseId to the primary base and reset sucursal/location
  useEffect(() => {
    if (!bases || !selectedRegionalLabel) return;
    const primaryId = getPrimaryBaseId(selectedRegionalLabel, bases, null);
    if (primaryId) {
      setLocalConfig((prev) => ({
        ...prev,
        baseId: primaryId,
        regionalLabel: selectedRegionalLabel,
        aggregateBaseIds: getBaseIdsForRegional(selectedRegionalLabel, bases, null),
      }));
    }
    setSelectedSucursal("todas");
    setLocationSucursal("");
  }, [selectedRegionalLabel, bases]);

  // When sucursal or locationSucursal changes, update baseId for weather/historical lookups
  useEffect(() => {
    if (!bases || !selectedRegional) return;
    const refSucursal =
      selectedSucursal !== "todas"
        ? selectedSucursal
        : locationSucursal || null;
    const primaryId = getPrimaryBaseId(selectedRegional.label, bases, refSucursal);
    if (primaryId) {
      setLocalConfig((prev) => ({
        ...prev,
        baseId: primaryId,
        regionalLabel: selectedRegional.label,
        aggregateBaseIds: getBaseIdsForRegional(
          selectedRegional.label,
          bases,
          hasSucursais && selectedSucursal !== "todas" ? selectedSucursal : null
        ),
      }));
    }
  }, [selectedSucursal, locationSucursal, bases, selectedRegional, hasSucursais]);


  const handleChange = (field: keyof SimulationConfig, value: number | string | number[]) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleTeamHourChange = (hour: number, value: number, day: number = 1) => {
    const fieldName = day === 1 ? "teamsPerHour" : day === 2 ? "teamsPerHourDay2" : "teamsPerHourDay3";
    const currentTeams = localConfig[fieldName] || [...defaultTeamsPerHour];
    const newTeams = [...currentTeams];
    newTeams[hour] = Math.max(0, Math.min(200, value));
    setLocalConfig((prev) => ({ ...prev, [fieldName]: newTeams }));
  };

  const handleLossTeamHourChange = (hour: number, value: number, day: number = 1) => {
    const fieldName = day === 1 ? "lossTeamsPerHour" : day === 2 ? "lossTeamsPerHourDay2" : "lossTeamsPerHourDay3";
    const currentTeams = localConfig[fieldName] || [...defaultLossTeamsPerHour];
    const newTeams = [...currentTeams];
    newTeams[hour] = Math.max(0, Math.min(200, value));
    setLocalConfig((prev) => ({ ...prev, [fieldName]: newTeams }));
  };

  const copyFromDay1 = (day: number) => {
    if (day === 2) {
      setLocalConfig((prev) => ({
        ...prev,
        teamsPerHourDay2: [...prev.teamsPerHour],
        lossTeamsPerHourDay2: [...(prev.lossTeamsPerHour || defaultLossTeamsPerHour)],
      }));
    } else if (day === 3) {
      setLocalConfig((prev) => ({
        ...prev,
        teamsPerHourDay3: [...prev.teamsPerHour],
        lossTeamsPerHourDay3: [...(prev.lossTeamsPerHour || defaultLossTeamsPerHour)],
      }));
    }
  };

  // Load structure from database
  const loadStructure = (structureId: string, day: number) => {
    const structure = teamStructures?.find(s => s.id === structureId);
    if (!structure) return;

    const teams = structureToTeamsArray(structure);
    const lossTeams = structureToLossTeamsArray(structure);

    if (day === 1) {
      setLocalConfig((prev) => ({
        ...prev,
        teamsPerHour: teams,
        lossTeamsPerHour: lossTeams,
      }));
    } else if (day === 2) {
      setLocalConfig((prev) => ({
        ...prev,
        teamsPerHourDay2: teams,
        lossTeamsPerHourDay2: lossTeams,
      }));
    } else if (day === 3) {
      setLocalConfig((prev) => ({
        ...prev,
        teamsPerHourDay3: teams,
        lossTeamsPerHourDay3: lossTeams,
      }));
    }
  };

  // Copy first hour value to entire shift
  const copyFirstHourToShift = (turnoRange: number[], day: number, isLoss: boolean) => {
    const fieldName = isLoss
      ? (day === 1 ? "lossTeamsPerHour" : day === 2 ? "lossTeamsPerHourDay2" : "lossTeamsPerHourDay3")
      : (day === 1 ? "teamsPerHour" : day === 2 ? "teamsPerHourDay2" : "teamsPerHourDay3");
    const currentTeams = [...(localConfig[fieldName] || defaultTeamsPerHour)];
    const firstValue = currentTeams[turnoRange[0]];
    turnoRange.forEach((hour) => {
      currentTeams[hour] = firstValue;
    });
    setLocalConfig((prev) => ({ ...prev, [fieldName]: currentTeams }));
  };

  // Zero out entire shift
  const zeroShift = (turnoRange: number[], day: number, isLoss: boolean) => {
    const fieldName = isLoss
      ? (day === 1 ? "lossTeamsPerHour" : day === 2 ? "lossTeamsPerHourDay2" : "lossTeamsPerHourDay3")
      : (day === 1 ? "teamsPerHour" : day === 2 ? "teamsPerHourDay2" : "teamsPerHourDay3");
    const currentTeams = [...(localConfig[fieldName] || defaultTeamsPerHour)];
    turnoRange.forEach((hour) => {
      currentTeams[hour] = 0;
    });
    setLocalConfig((prev) => ({ ...prev, [fieldName]: currentTeams }));
  };

  // Zero out entire day
  const zeroDay = (day: number, isLoss: boolean) => {
    const fieldName = isLoss
      ? (day === 1 ? "lossTeamsPerHour" : day === 2 ? "lossTeamsPerHourDay2" : "lossTeamsPerHourDay3")
      : (day === 1 ? "teamsPerHour" : day === 2 ? "teamsPerHourDay2" : "teamsPerHourDay3");
    setLocalConfig((prev) => ({ ...prev, [fieldName]: [...defaultTeamsPerHour] }));
  };

  const handleApply = () => {
    onConfigChange(localConfig);
    onCalculate();
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalConfig({
      ...config,
      teamsPerHour: [...defaultTeamsPerHour],
      lossTeamsPerHour: [...defaultLossTeamsPerHour],
      teamsPerHourDay2: [...defaultTeamsPerHour],
      lossTeamsPerHourDay2: [...defaultLossTeamsPerHour],
      teamsPerHourDay3: [...defaultTeamsPerHour],
      lossTeamsPerHourDay3: [...defaultLossTeamsPerHour],
      horizonHours: 24,
      btInitialBacklog: 0,
      mtInitialBacklog: 0,
    });
  };

  // Team types that count as "general" teams (equipes gerais)
  const GENERAL_TEAM_TYPES = ["Emergência", "Gestores", "Poda", "Cesto Manutenção", "Cesto Obras", "Apoio UTS", "Apoio UTN"];
  // Team types that count as "BT loss" teams (equipes BT)
  const BT_TEAM_TYPES = ["Corte e Religa", "Perdas"];

  // Load declared structure from daily plans for a specific date
  const handleLoadDeclaredStructure = async (day: number, kind: "planejado" | "realizado" = "planejado") => {
    if (!bases || declaredBaseIds.length === 0) return;
    setLoadingDeclared(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // Fetch plans for all relevant base IDs
      const planIds: string[] = [];

      for (const baseId of declaredBaseIds) {
        const { data } = await supabase
          .from("daily_team_plans")
          .select("id")
          .eq("base_id", baseId)
          .eq("plan_date", declaredDateStr)
          .eq("plan_kind", kind)
          .maybeSingle();

        if (data?.id) {
          planIds.push(data.id);
        }
      }

      if (planIds.length === 0) {
        toast({
          title: kind === "realizado" ? "Sem estrutura realizada" : "Sem estrutura planejada",
          description: `Nenhum plano encontrado para ${format(declaredDate, "dd/MM/yyyy")}`,
          variant: "destructive",
        });
        return;
      }

      // Fetch all team type entries for those plans
      const { data: entries } = await supabase
        .from("daily_team_type_entries")
        .select("*")
        .in("daily_plan_id", planIds);

      // Sum by team type category per hour
      const summedTeams = Array(24).fill(0);
      const summedLoss = Array(24).fill(0);

      if (entries && entries.length > 0) {
        for (const entry of entries) {
          if (GENERAL_TEAM_TYPES.includes(entry.team_type)) {
            summedTeams[entry.hour] = (summedTeams[entry.hour] || 0) + (entry.quantity || 0);
          } else if (BT_TEAM_TYPES.includes(entry.team_type)) {
            summedLoss[entry.hour] = (summedLoss[entry.hour] || 0) + (entry.quantity || 0);
          }
        }
      } else {
        // Fallback: use totals from daily_team_plans if no type entries exist
        const { data: plans } = await supabase
          .from("daily_team_plans")
          .select("*")
          .in("id", planIds);

        if (plans) {
          for (const plan of plans) {
            for (let h = 0; h < 24; h++) {
              summedTeams[h] += (plan as any)[`teams_hour_${h}`] ?? 0;
              summedLoss[h] += (plan as any)[`loss_teams_hour_${h}`] ?? 0;
            }
          }
        }
      }

      const teamsField = day === 1 ? "teamsPerHour" : day === 2 ? "teamsPerHourDay2" : "teamsPerHourDay3";
      const lossField = day === 1 ? "lossTeamsPerHour" : day === 2 ? "lossTeamsPerHourDay2" : "lossTeamsPerHourDay3";

      setLocalConfig((prev) => ({
        ...prev,
        [teamsField]: summedTeams,
        [lossField]: summedLoss,
      }));

      const sucursalLabel = hasSucursais && selectedSucursal !== "todas"
        ? selectedSucursal
        : hasSucursais ? `todas as sucursais de ${selectedRegional?.label}` : selectedRegionalLabel;

      toast({
        title: kind === "realizado" ? "Estrutura realizada carregada" : "Estrutura planejada carregada",
        description: `${planIds.length} plano(s) de ${sucursalLabel} somados para ${format(declaredDate, "dd/MM/yyyy")}`,
      });
      setDeclaredDateOpen(false);
    } catch {
      toast({ title: "Erro ao carregar estrutura", variant: "destructive" });
    } finally {
      setLoadingDeclared(false);
    }
  };

  // selectedBase already declared above in hooks section


  // Determine which days to show based on current hour + horizon
  const currentHour = new Date().getHours();
  const showDay2 = (currentHour + localConfig.horizonHours) > 24;
  const showDay3 = (currentHour + localConfig.horizonHours) > 48;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 bg-secondary/50 border-border hover:bg-secondary">
          <Play className="w-4 h-4" />
          Simulação
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Configurações da Simulação</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Configure a base, equipes por turno e horizonte de previsão
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Base (Regional) Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Base</Label>
            <Select
              value={selectedRegionalLabel}
              onValueChange={setSelectedRegionalLabel}
              disabled={basesLoading}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder={basesLoading ? "Carregando..." : "Selecione a base"} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                {REGIONAIS.map((r) => (
                  <SelectItem key={r.label} value={r.label}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sucursal dropdown — only shown if base has sucursais */}
            {hasSucursais && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Sucursal</Label>
                <Select value={selectedSucursal} onValueChange={setSelectedSucursal}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="todas">Todas as sucursais</SelectItem>
                    {selectedRegional?.sucursais.map((s) => (
                      <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedSucursal === "todas"
                    ? "Estruturas declaradas serão somadas de todas as sucursais"
                    : `Sucursal selecionada: ${selectedSucursal}`}
                </p>
              </div>
            )}

            {/* Location reference — only when "todas" is selected */}
            {hasSucursais && selectedSucursal === "todas" && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Localidade de referência</Label>
                <Select value={locationSucursal} onValueChange={setLocationSucursal}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione a sucursal de referência" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {selectedRegional?.sucursais.map((s) => (
                      <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Localidade usada para previsão do tempo e dados históricos
                </p>
              </div>
            )}
          </div>


          {/* Simulation Mode Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Tipo de Simulação</Label>
            <Select
              value={localConfig.horizonUnit || "hours"}
              onValueChange={(value) => {
                const newUnit = value as "hours" | "days";
                // Convert current value when switching modes
                let newHorizon = localConfig.horizonHours;
                if (newUnit === "days") {
                  // Convert hours to days (round up, max 7 days)
                  newHorizon = Math.min(7, Math.max(1, Math.ceil(localConfig.horizonHours / 24))) * 24;
                } else {
                  // Keep same horizon but cap at 180
                  newHorizon = Math.min(180, localConfig.horizonHours);
                }
                setLocalConfig((prev) => ({
                  ...prev,
                  horizonUnit: newUnit,
                  horizonHours: newHorizon,
                }));
              }}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="hours">Simulação Micro</SelectItem>
                <SelectItem value="days">Simulação Macro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {(localConfig.horizonUnit || "hours") === "hours"
                ? "Modo detalhado com alocação de equipes por hora"
                : "Modo simplificado com estrutura padrão por dia"}
            </p>
          </div>

          {/* Macro Mode - Structure Selection per Day */}
          {(localConfig.horizonUnit || "hours") === "days" && teamStructures && teamStructures.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Estrutura de Equipes por Dia
              </h4>
              <p className="text-xs text-muted-foreground">
                Selecione uma estrutura padrão para cada dia. Você pode editar os valores após a simulação.
              </p>
              {(() => {
                const numDays = Math.ceil(localConfig.horizonHours / 24);
                return Array.from({ length: Math.min(numDays, 7) }, (_, i) => i + 1).map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-16">Dia {day}</span>
                    <Select
                      value={
                        day === 1 ? (localConfig as any).macroStructureDay1 || "" :
                        day === 2 ? (localConfig as any).macroStructureDay2 || "" :
                        day === 3 ? (localConfig as any).macroStructureDay3 || "" :
                        day === 4 ? (localConfig as any).macroStructureDay4 || "" :
                        day === 5 ? (localConfig as any).macroStructureDay5 || "" :
                        day === 6 ? (localConfig as any).macroStructureDay6 || "" :
                        (localConfig as any).macroStructureDay7 || ""
                      }
                      onValueChange={(structureId) => {
                        const structure = teamStructures.find(s => s.id === structureId);
                        if (!structure) return;
                        
                        const teams = structureToTeamsArray(structure);
                        const lossTeams = structureToLossTeamsArray(structure);
                        
                        const fieldKey = `macroStructureDay${day}` as keyof SimulationConfig;
                        const teamsField = day === 1 ? "teamsPerHour" : day === 2 ? "teamsPerHourDay2" : "teamsPerHourDay3";
                        const lossField = day === 1 ? "lossTeamsPerHour" : day === 2 ? "lossTeamsPerHourDay2" : "lossTeamsPerHourDay3";
                        
                        setLocalConfig((prev) => ({
                          ...prev,
                          [fieldKey]: structureId,
                          ...(day <= 3 ? { [teamsField]: teams, [lossField]: lossTeams } : {}),
                        }));
                      }}
                    >
                      <SelectTrigger className="flex-1 bg-secondary border-border">
                        <SelectValue placeholder="Selecione estrutura..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {teamStructures.map((structure) => (
                          <SelectItem key={structure.id} value={structure.id}>
                            {structure.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Horizon Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Horizonte de Simulação</Label>
              <span className="text-sm font-mono text-primary">
                {(localConfig.horizonUnit || "hours") === "days"
                  ? `${Math.ceil(localConfig.horizonHours / 24)}d (${localConfig.horizonHours}h)`
                  : `${localConfig.horizonHours}h`}
              </span>
            </div>
            {(localConfig.horizonUnit || "hours") === "hours" ? (
              <>
                <Slider
                  value={[localConfig.horizonHours]}
                  onValueChange={([value]) => handleChange("horizonHours", value)}
                  min={1}
                  max={72}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1h</span>
                  <span>24h</span>
                  <span>48h</span>
                  <span>72h</span>
                </div>
              </>
            ) : (
              <>
                <Slider
                  value={[Math.ceil(localConfig.horizonHours / 24)]}
                  onValueChange={([value]) => handleChange("horizonHours", value * 24)}
                  min={1}
                  max={7}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1d</span>
                  <span>2d</span>
                  <span>3d</span>
                  <span>4d</span>
                  <span>5d</span>
                  <span>6d</span>
                  <span>7d</span>
                </div>
              </>
            )}
          </div>

          {/* Backlog Inicial */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Backlog Inicial
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Incidentes BT</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={localConfig.btInitialBacklog}
                  onChange={(e) =>
                    handleChange("btInitialBacklog", Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Incidentes MT</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={localConfig.mtInitialBacklog}
                  onChange={(e) =>
                    handleChange("mtInitialBacklog", Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>
          </div>

          {/* Team sections only show in Micro mode */}
          {(localConfig.horizonUnit || "hours") === "hours" && (
          <>
          {/* Day 1 - Equipes por Turno */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Dia 1 - Equipes por Hora
                </h4>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {teamStructures && teamStructures.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <Download className="w-3 h-3" />
                        Carregar Estrutura
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a estrutura:</p>
                        {teamStructures.map((structure) => (
                          <Button
                            key={structure.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => loadStructure(structure.id, 1)}
                          >
                            {structure.name}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                {/* Carregar Estrutura Declarada */}
                <Popover open={declaredDateOpen} onOpenChange={setDeclaredDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={loadingDeclared}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      Carregar Declarada
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="end">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a data:</p>
                    <Calendar
                      mode="single"
                      selected={declaredDate}
                      onSelect={(d) => d && setDeclaredDate(d)}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                    <p className="text-xs text-muted-foreground mt-2 mb-3">
                      {hasSucursais
                        ? selectedSucursal === "todas"
                          ? `Somará todas as sucursais de ${selectedRegional?.label}`
                          : `Carregará plano de ${selectedSucursal}`
                        : `Carregará plano de ${selectedRegionalLabel || "base selecionada"}`}
                    </p>
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => handleLoadDeclaredStructure(1)}
                      disabled={loadingDeclared}
                    >
                      {loadingDeclared ? "Carregando..." : `Carregar para Dia 1`}
                    </Button>
                  </PopoverContent>
                </Popover>
                {/* Carregar Estrutura Realizada - Dia 1 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={loadingDeclared}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      Carregar Realizado
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="end">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a data:</p>
                    <Calendar
                      mode="single"
                      selected={declaredDate}
                      onSelect={(d) => d && setDeclaredDate(d)}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                    <Button
                      size="sm"
                      className="w-full text-xs mt-2"
                      onClick={() => handleLoadDeclaredStructure(1, "realizado")}
                      disabled={loadingDeclared}
                    >
                      {loadingDeclared ? "Carregando..." : "Carregar para Dia 1"}
                    </Button>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => zeroDay(1, false)}
                  className="gap-1 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  Zerar Dia
                </Button>
              </div>
            </div>

            {turnos.map((turno) => {
              const totalTurno = turno.range.reduce((sum, h) => sum + localConfig.teamsPerHour[h], 0);
              
              return (
                <div key={turno.id} className={cn("space-y-2 p-3 rounded-lg border bg-secondary/20", turno.colorClass)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("turno-badge", `turno-${turno.id.toLowerCase()}`)}>
                        {turno.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{turno.hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyFirstHourToShift(turno.range, 1, false)}
                        className="h-6 px-2 text-xs"
                        title="Copiar primeiro horário para todo o turno"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => zeroShift(turno.range, 1, false)}
                        className="h-6 px-2 text-xs"
                        title="Zerar turno"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <span className="text-xs font-mono">Média: {(totalTurno / 8).toFixed(1)} eq/h</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-8 gap-1">
                    {turno.range.map((hour) => (
                      <div key={hour} className="space-y-1">
                        <Label className="text-xs text-center block text-muted-foreground">
                          {hour.toString().padStart(2, "0")}h
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={localConfig.teamsPerHour[hour]}
                          onChange={(e) => handleTeamHourChange(hour, parseInt(e.target.value) || 0, 1)}
                          onFocus={(e) => e.target.select()}
                          className="bg-secondary border-border font-mono text-center h-8 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day 1 - Equipes de BT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Dia 1 - Equipes de BT <span className="text-xs normal-case font-normal">(só BT)</span>
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => zeroDay(1, true)}
                className="gap-1 text-xs"
              >
                <Trash2 className="w-3 h-3" />
                Zerar Dia
              </Button>
            </div>

            {turnos.map((turno) => {
              const lossTeams = localConfig.lossTeamsPerHour || defaultLossTeamsPerHour;
              const totalTurno = turno.range.reduce((sum, h) => sum + lossTeams[h], 0);
              
              return (
                <div key={`loss-${turno.id}`} className={cn("space-y-2 p-3 rounded-lg border bg-orange-500/10 border-orange-500/30", turno.colorClass.replace(/text-\w+-400/, 'text-orange-400').replace(/border-\w+-500\/30/, ''))}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("turno-badge bg-orange-500/20 text-orange-400")}>
                        {turno.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{turno.hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyFirstHourToShift(turno.range, 1, true)}
                        className="h-6 px-2 text-xs"
                        title="Copiar primeiro horário para todo o turno"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => zeroShift(turno.range, 1, true)}
                        className="h-6 px-2 text-xs text-orange-400"
                        title="Zerar turno"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <span className="text-xs font-mono text-orange-400">Média: {(totalTurno / 8).toFixed(1)} eq/h</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-8 gap-1">
                    {turno.range.map((hour) => (
                      <div key={hour} className="space-y-1">
                        <Label className="text-xs text-center block text-muted-foreground">
                          {hour.toString().padStart(2, "0")}h
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={lossTeams[hour]}
                          onChange={(e) => handleLossTeamHourChange(hour, parseInt(e.target.value) || 0, 1)}
                          onFocus={(e) => e.target.select()}
                          className="bg-orange-500/10 border-orange-500/30 font-mono text-center h-8 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day 2 - Equipes por Turno */}
          {showDay2 && (
            <>
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Dia 2 - Equipes por Hora
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {teamStructures && teamStructures.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            Carregar Estrutura
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="end">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a estrutura:</p>
                            {teamStructures.map((structure) => (
                              <Button
                                key={structure.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={() => loadStructure(structure.id, 2)}
                              >
                                {structure.name}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {/* Carregar Estrutura Declarada - Dia 2 */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          disabled={loadingDeclared}
                        >
                          <CalendarIcon className="w-3 h-3" />
                          Carregar Declarada
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="end">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a data:</p>
                        <Calendar
                          mode="single"
                          selected={declaredDate}
                          onSelect={(d) => d && setDeclaredDate(d)}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                        <Button
                          size="sm"
                          className="w-full text-xs mt-2"
                          onClick={() => handleLoadDeclaredStructure(2)}
                          disabled={loadingDeclared}
                        >
                          {loadingDeclared ? "Carregando..." : "Carregar para Dia 2"}
                        </Button>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyFromDay1(2)}
                      className="gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar do Dia 1
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => zeroDay(2, false)}
                      className="gap-1 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      Zerar Dia
                    </Button>
                  </div>
                </div>

                {turnos.map((turno) => {
                  const teams = localConfig.teamsPerHourDay2 || defaultTeamsPerHour;
                  const totalTurno = turno.range.reduce((sum, h) => sum + teams[h], 0);
                  
                  return (
                    <div key={`day2-${turno.id}`} className={cn("space-y-2 p-3 rounded-lg border bg-secondary/20", turno.colorClass)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("turno-badge", `turno-${turno.id.toLowerCase()}`)}>
                            {turno.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{turno.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyFirstHourToShift(turno.range, 2, false)}
                            className="h-6 px-2 text-xs"
                            title="Copiar primeiro horário para todo o turno"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => zeroShift(turno.range, 2, false)}
                            className="h-6 px-2 text-xs"
                            title="Zerar turno"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-mono">Média: {(totalTurno / 8).toFixed(1)} eq/h</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-8 gap-1">
                        {turno.range.map((hour) => (
                          <div key={hour} className="space-y-1">
                            <Label className="text-xs text-center block text-muted-foreground">
                              {hour.toString().padStart(2, "0")}h
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={200}
                              value={teams[hour]}
                              onChange={(e) => handleTeamHourChange(hour, parseInt(e.target.value) || 0, 2)}
                              onFocus={(e) => e.target.select()}
                              className="bg-secondary border-border font-mono text-center h-8 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day 2 - Equipes de BT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Dia 2 - Equipes de BT <span className="text-xs normal-case font-normal">(só BT)</span>
                    </h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => zeroDay(2, true)}
                    className="gap-1 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    Zerar Dia
                  </Button>
                </div>

                {turnos.map((turno) => {
                  const lossTeams = localConfig.lossTeamsPerHourDay2 || defaultLossTeamsPerHour;
                  const totalTurno = turno.range.reduce((sum, h) => sum + lossTeams[h], 0);
                  
                  return (
                    <div key={`loss-day2-${turno.id}`} className={cn("space-y-2 p-3 rounded-lg border bg-orange-500/10 border-orange-500/30", turno.colorClass.replace(/text-\w+-400/, 'text-orange-400').replace(/border-\w+-500\/30/, ''))}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("turno-badge bg-orange-500/20 text-orange-400")}>
                            {turno.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{turno.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyFirstHourToShift(turno.range, 2, true)}
                            className="h-6 px-2 text-xs"
                            title="Copiar primeiro horário para todo o turno"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => zeroShift(turno.range, 2, true)}
                            className="h-6 px-2 text-xs text-orange-400"
                            title="Zerar turno"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-mono text-orange-400">Média: {(totalTurno / 8).toFixed(1)} eq/h</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-8 gap-1">
                        {turno.range.map((hour) => (
                          <div key={hour} className="space-y-1">
                            <Label className="text-xs text-center block text-muted-foreground">
                              {hour.toString().padStart(2, "0")}h
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={200}
                              value={lossTeams[hour]}
                              onChange={(e) => handleLossTeamHourChange(hour, parseInt(e.target.value) || 0, 2)}
                              onFocus={(e) => e.target.select()}
                              className="bg-orange-500/10 border-orange-500/30 font-mono text-center h-8 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Day 3 - Equipes por Turno */}
          {showDay3 && (
            <>
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Dia 3 - Equipes por Hora
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {teamStructures && teamStructures.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            Carregar Estrutura
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="end">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a estrutura:</p>
                            {teamStructures.map((structure) => (
                              <Button
                                key={structure.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={() => loadStructure(structure.id, 3)}
                              >
                                {structure.name}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {/* Carregar Estrutura Declarada - Dia 3 */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          disabled={loadingDeclared}
                        >
                          <CalendarIcon className="w-3 h-3" />
                          Carregar Declarada
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="end">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Selecione a data:</p>
                        <Calendar
                          mode="single"
                          selected={declaredDate}
                          onSelect={(d) => d && setDeclaredDate(d)}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                        <Button
                          size="sm"
                          className="w-full text-xs mt-2"
                          onClick={() => handleLoadDeclaredStructure(3)}
                          disabled={loadingDeclared}
                        >
                          {loadingDeclared ? "Carregando..." : "Carregar para Dia 3"}
                        </Button>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyFromDay1(3)}
                      className="gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar do Dia 1
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => zeroDay(3, false)}
                      className="gap-1 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      Zerar Dia
                    </Button>
                  </div>
                </div>

                {turnos.map((turno) => {
                  const teams = localConfig.teamsPerHourDay3 || defaultTeamsPerHour;
                  const totalTurno = turno.range.reduce((sum, h) => sum + teams[h], 0);
                  
                  return (
                    <div key={`day3-${turno.id}`} className={cn("space-y-2 p-3 rounded-lg border bg-secondary/20", turno.colorClass)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("turno-badge", `turno-${turno.id.toLowerCase()}`)}>
                            {turno.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{turno.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyFirstHourToShift(turno.range, 3, false)}
                            className="h-6 px-2 text-xs"
                            title="Copiar primeiro horário para todo o turno"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => zeroShift(turno.range, 3, false)}
                            className="h-6 px-2 text-xs"
                            title="Zerar turno"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-mono">Média: {(totalTurno / 8).toFixed(1)} eq/h</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-8 gap-1">
                        {turno.range.map((hour) => (
                          <div key={hour} className="space-y-1">
                            <Label className="text-xs text-center block text-muted-foreground">
                              {hour.toString().padStart(2, "0")}h
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={200}
                              value={teams[hour]}
                              onChange={(e) => handleTeamHourChange(hour, parseInt(e.target.value) || 0, 3)}
                              onFocus={(e) => e.target.select()}
                              className="bg-secondary border-border font-mono text-center h-8 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day 3 - Equipes de BT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Dia 3 - Equipes de BT <span className="text-xs normal-case font-normal">(só BT)</span>
                    </h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => zeroDay(3, true)}
                    className="gap-1 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    Zerar Dia
                  </Button>
                </div>

                {turnos.map((turno) => {
                  const lossTeams = localConfig.lossTeamsPerHourDay3 || defaultLossTeamsPerHour;
                  const totalTurno = turno.range.reduce((sum, h) => sum + lossTeams[h], 0);
                  
                  return (
                    <div key={`loss-day3-${turno.id}`} className={cn("space-y-2 p-3 rounded-lg border bg-orange-500/10 border-orange-500/30", turno.colorClass.replace(/text-\w+-400/, 'text-orange-400').replace(/border-\w+-500\/30/, ''))}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("turno-badge bg-orange-500/20 text-orange-400")}>
                            {turno.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{turno.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyFirstHourToShift(turno.range, 3, true)}
                            className="h-6 px-2 text-xs"
                            title="Copiar primeiro horário para todo o turno"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => zeroShift(turno.range, 3, true)}
                            className="h-6 px-2 text-xs text-orange-400"
                            title="Zerar turno"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-mono text-orange-400">Média: {(totalTurno / 8).toFixed(1)} eq/h</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-8 gap-1">
                        {turno.range.map((hour) => (
                          <div key={hour} className="space-y-1">
                            <Label className="text-xs text-center block text-muted-foreground">
                              {hour.toString().padStart(2, "0")}h
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={200}
                              value={lossTeams[hour]}
                              onChange={(e) => handleLossTeamHourChange(hour, parseInt(e.target.value) || 0, 3)}
                              onFocus={(e) => e.target.select()}
                              className="bg-orange-500/10 border-orange-500/30 font-mono text-center h-8 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 gap-2 border-border hover:bg-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="w-4 h-4" />
              Simular
            </Button>
            {onSave && (
              <Button
                onClick={() => {
                  handleApply();
                  onSave();
                }}
                disabled={isSaving}
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10"
              >
                <Save className="w-4 h-4" />
                Salvar
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
