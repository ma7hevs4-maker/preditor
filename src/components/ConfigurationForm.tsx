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
import { useBases, Base } from "@/hooks/useBases";
import { SimulationConfig } from "@/hooks/useSimulation";

interface ConfigurationFormProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
  onCalculate: () => void;
}

const defaultTeamsPerHour = [
  0, 0, 0, 0, 0, 0, // 0-5h (madrugada)
  2, 4, 6, 8, 8, 8, // 6-11h (manhã)
  8, 8, 8, 8, 8, 6, // 12-17h (tarde)
  4, 4, 3, 2, 1, 0, // 18-23h (noite)
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
    newTeams[hour] = Math.max(0, Math.min(50, value));
    setLocalConfig((prev) => ({ ...prev, teamsPerHour: newTeams }));
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
      horizonHours: 24,
      btInitialBacklog: 0,
      mtInitialBacklog: 0,
    });
  };

  const selectedBase = bases?.find((b) => b.id === localConfig.baseId);
  const totalTeams = localConfig.teamsPerHour.reduce((a, b) => a + b, 0);

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
            Configure a base, equipes por hora e horizonte de previsão
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

          {/* Equipes por Hora */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipes por Hora
              </h4>
              <span className="text-xs text-muted-foreground">
                Total: <span className="font-mono text-primary">{totalTeams}</span> equipes-hora
              </span>
            </div>
            
            {/* Grid de inputs 24h */}
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="space-y-1">
                  <Label 
                    className={cn(
                      "text-xs text-center block",
                      hour >= 0 && hour < 6 && "text-blue-400",
                      hour >= 6 && hour < 12 && "text-amber-400",
                      hour >= 12 && hour < 18 && "text-orange-400",
                      hour >= 18 && "text-purple-400"
                    )}
                  >
                    {hour.toString().padStart(2, "0")}h
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={localConfig.teamsPerHour[hour]}
                    onChange={(e) => handleTeamHourChange(hour, parseInt(e.target.value) || 0)}
                    className="bg-secondary border-border font-mono text-center h-9 px-1 text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Legenda períodos */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Madrugada (0-5h)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Manhã (6-11h)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Tarde (12-17h)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Noite (18-23h)
              </span>
            </div>
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
