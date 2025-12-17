import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Settings, Play, RotateCcw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBases } from "@/hooks/useBases";
import { SimulationConfig } from "@/hooks/useSimulation";

interface ConfigurationFormProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
  onCalculate: () => void;
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
}: ConfigurationFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<SimulationConfig>(config);
  const { data: bases, isLoading: basesLoading } = useBases();

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (field: keyof SimulationConfig, value: number | string | number[]) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleTeamHourChange = (hour: number, value: number) => {
    const newTeams = [...localConfig.teamsPerHour];
    newTeams[hour] = Math.max(0, Math.min(200, value));
    setLocalConfig((prev) => ({ ...prev, teamsPerHour: newTeams }));
  };

  const handleLossTeamHourChange = (hour: number, value: number) => {
    const newTeams = [...(localConfig.lossTeamsPerHour || defaultLossTeamsPerHour)];
    newTeams[hour] = Math.max(0, Math.min(200, value));
    setLocalConfig((prev) => ({ ...prev, lossTeamsPerHour: newTeams }));
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
      horizonHours: 24,
      btInitialBacklog: 0,
      mtInitialBacklog: 0,
    });
  };

  const selectedBase = bases?.find((b) => b.id === localConfig.baseId);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 bg-secondary/50 border-border hover:bg-secondary">
          <Settings className="w-4 h-4" />
          Configurar
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
          {/* Base Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Base / Região</Label>
            <Select
              value={localConfig.baseId}
              onValueChange={(value) => handleChange("baseId", value)}
              disabled={basesLoading}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder={basesLoading ? "Carregando..." : "Selecione a base"} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                {bases?.map((base) => (
                  <SelectItem key={base.id} value={base.id}>
                    {base.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBase && (
              <p className="text-xs text-muted-foreground">
                Lat: {selectedBase.lat}, Lon: {selectedBase.lon}
              </p>
            )}
          </div>

          {/* Horizon Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Horizonte de Simulação</Label>
              <span className="text-sm font-mono text-primary">{localConfig.horizonHours}h</span>
            </div>
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

          {/* Equipes por Turno */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Equipes por Hora (por Turno)
              </h4>
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
                    <span className="text-xs font-mono">Total: {totalTurno} eq-h</span>
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
                          onChange={(e) => handleTeamHourChange(hour, parseInt(e.target.value) || 0)}
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

          {/* Equipes de Perdas (só BT) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Equipes de Perdas <span className="text-xs normal-case font-normal">(só BT)</span>
              </h4>
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
                    <span className="text-xs font-mono text-orange-400">Total: {totalTurno} eq-h</span>
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
                          onChange={(e) => handleLossTeamHourChange(hour, parseInt(e.target.value) || 0)}
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
