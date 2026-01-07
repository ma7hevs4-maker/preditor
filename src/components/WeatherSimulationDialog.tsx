import { useState } from "react";
import { CloudRain, Wind, Thermometer, Beaker, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export interface WeatherOverride {
  enabled: boolean;
  precip_mm: number;
  wind_kmh: number;
  temp_c: number;
}

interface WeatherSimulationDialogProps {
  weatherOverride: WeatherOverride;
  onWeatherOverrideChange: (override: WeatherOverride) => void;
}

export const WeatherSimulationDialog = ({
  weatherOverride,
  onWeatherOverrideChange,
}: WeatherSimulationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [localOverride, setLocalOverride] = useState<WeatherOverride>(weatherOverride);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalOverride(weatherOverride);
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    onWeatherOverrideChange(localOverride);
    setOpen(false);
  };

  const handleClear = () => {
    const cleared = { enabled: false, precip_mm: 0, wind_kmh: 0, temp_c: 25 };
    onWeatherOverrideChange(cleared);
    setLocalOverride(cleared);
    setOpen(false);
  };

  const presets = [
    { name: "Chuva Forte", precip_mm: 8, wind_kmh: 25, temp_c: 22 },
    { name: "Vento Muito Forte", precip_mm: 0.5, wind_kmh: 80, temp_c: 28 },
    { name: "Tempestade", precip_mm: 15, wind_kmh: 90, temp_c: 20 },
    { name: "Calor Extremo", precip_mm: 0, wind_kmh: 10, temp_c: 40 },
    { name: "Frio Intenso", precip_mm: 0.5, wind_kmh: 20, temp_c: 8 },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant={weatherOverride.enabled ? "default" : "outline"}
          size="sm"
          className={`gap-2 ${weatherOverride.enabled ? "bg-warning text-warning-foreground hover:bg-warning/90" : "bg-secondary/50 border-border hover:bg-secondary"}`}
          title="Simular Clima"
        >
          <Beaker className="w-4 h-4" />
          {weatherOverride.enabled && (
            <span className="text-xs">Simulado</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-warning" />
            Simular Condições Climáticas
          </DialogTitle>
          <DialogDescription>
            Defina valores manuais para testar diferentes cenários climáticos na simulação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Override */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-override" className="text-sm font-medium">
              Ativar Simulação de Clima
            </Label>
            <Switch
              id="enable-override"
              checked={localOverride.enabled}
              onCheckedChange={(checked) => 
                setLocalOverride({ ...localOverride, enabled: checked })
              }
            />
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Presets</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Badge
                  key={preset.name}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => setLocalOverride({
                    enabled: true,
                    precip_mm: preset.precip_mm,
                    wind_kmh: preset.wind_kmh,
                    temp_c: preset.temp_c,
                  })}
                >
                  {preset.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Weather Values */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  Chuva (mm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={localOverride.precip_mm}
                  onChange={(e) => setLocalOverride({
                    ...localOverride,
                    precip_mm: parseFloat(e.target.value) || 0
                  })}
                  className="h-9"
                  disabled={!localOverride.enabled}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  Vento (km/h)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="200"
                  value={localOverride.wind_kmh}
                  onChange={(e) => setLocalOverride({
                    ...localOverride,
                    wind_kmh: parseFloat(e.target.value) || 0
                  })}
                  className="h-9"
                  disabled={!localOverride.enabled}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  Temp (°C)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="-10"
                  max="50"
                  value={localOverride.temp_c}
                  onChange={(e) => setLocalOverride({
                    ...localOverride,
                    temp_c: parseFloat(e.target.value) || 0
                  })}
                  className="h-9"
                  disabled={!localOverride.enabled}
                />
              </div>
            </div>
          </div>

          {/* Info */}
          {localOverride.enabled && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Os valores simulados serão aplicados a todas as horas do horizonte de simulação.
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleClear}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Limpar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
