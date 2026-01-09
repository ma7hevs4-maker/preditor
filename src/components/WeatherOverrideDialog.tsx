import { useState, useMemo } from "react";
import { Cloud, Thermometer, Wind, CloudRain, Clock, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface WeatherOverride {
  enabled: boolean;
  precip_mm: number;
  wind_kmh: number;
  gust_kmh: number;
  temp_c: number;
  // Period controls
  startDay: number; // 1, 2, or 3
  startHour: number; // 0-23
  endDay: number; // 1, 2, or 3
  endHour: number; // 0-23
  untilEnd: boolean; // If true, ignore endDay/endHour and go until simulation end
}

interface WeatherOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  override: WeatherOverride;
  onOverrideChange: (override: WeatherOverride) => void;
  horizonHours: number;
}

export const WeatherOverrideDialog = ({
  open,
  onOpenChange,
  override,
  onOverrideChange,
  horizonHours,
}: WeatherOverrideDialogProps) => {
  const [localOverride, setLocalOverride] = useState<WeatherOverride>(override);

  // Calculate number of days based on horizon
  const numDays = Math.ceil(horizonHours / 24);

  // Generate hour options
  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      value: i,
      label: `${i.toString().padStart(2, '0')}:00`,
    }));
  }, []);

  // Generate day options
  const dayOptions = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => ({
      value: i + 1,
      label: `Dia ${i + 1}`,
    }));
  }, [numDays]);

  const handleApply = () => {
    onOverrideChange(localOverride);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetOverride: WeatherOverride = {
      enabled: false,
      precip_mm: 0,
      wind_kmh: 10,
      gust_kmh: 15,
      temp_c: 25,
      startDay: 1,
      startHour: 0,
      endDay: 1,
      endHour: 23,
      untilEnd: true,
    };
    setLocalOverride(resetOverride);
    onOverrideChange(resetOverride);
  };

  // Presets for quick selection
  const presets = [
    { name: "Tempo Bom", precip_mm: 0, wind_kmh: 10, gust_kmh: 15, temp_c: 25 },
    { name: "Chuva Leve", precip_mm: 2, wind_kmh: 15, gust_kmh: 25, temp_c: 22 },
    { name: "Chuva Forte", precip_mm: 15, wind_kmh: 30, gust_kmh: 50, temp_c: 20 },
    { name: "Tempestade", precip_mm: 30, wind_kmh: 60, gust_kmh: 90, temp_c: 18 },
    { name: "Rajada Forte", precip_mm: 0, wind_kmh: 25, gust_kmh: 70, temp_c: 25 },
    { name: "Calor Intenso", precip_mm: 0, wind_kmh: 5, gust_kmh: 10, temp_c: 38 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Cloud className="w-5 h-5 text-primary" />
            Simular Clima
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Defina condições climáticas manuais para testar cenários
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Override Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Ativar simulação de clima</Label>
            </div>
            <Switch
              checked={localOverride.enabled}
              onCheckedChange={(checked) =>
                setLocalOverride((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {/* Period Selection */}
          <div className="space-y-3 p-4 rounded-lg bg-secondary/20 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">Período do Clima Simulado</Label>
            </div>
            
            {/* Start Period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Início - Dia</Label>
                <Select
                  value={localOverride.startDay.toString()}
                  onValueChange={(value) =>
                    setLocalOverride((prev) => ({ ...prev, startDay: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Início - Hora</Label>
                <Select
                  value={localOverride.startHour.toString()}
                  onValueChange={(value) =>
                    setLocalOverride((prev) => ({ ...prev, startHour: parseInt(value) }))
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour.value} value={hour.value.toString()}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Until End Toggle */}
            <div className="flex items-center justify-between py-2">
              <Label className="text-sm">Até o final da simulação</Label>
              <Switch
                checked={localOverride.untilEnd}
                onCheckedChange={(checked) =>
                  setLocalOverride((prev) => ({ ...prev, untilEnd: checked }))
                }
              />
            </div>

            {/* End Period - only show if not untilEnd */}
            {!localOverride.untilEnd && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fim - Dia</Label>
                  <Select
                    value={localOverride.endDay.toString()}
                    onValueChange={(value) =>
                      setLocalOverride((prev) => ({ ...prev, endDay: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fim - Hora</Label>
                  <Select
                    value={localOverride.endHour.toString()}
                    onValueChange={(value) =>
                      setLocalOverride((prev) => ({ ...prev, endHour: parseInt(value) }))
                    }
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map((hour) => (
                        <SelectItem key={hour.value} value={hour.value.toString()}>
                          {hour.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Period Summary */}
            <div className="text-xs text-muted-foreground mt-2 p-2 rounded bg-background/50">
              <Calendar className="w-3 h-3 inline mr-1" />
              {localOverride.untilEnd
                ? `Dia ${localOverride.startDay} às ${localOverride.startHour.toString().padStart(2, '0')}:00 → Final da simulação`
                : `Dia ${localOverride.startDay} às ${localOverride.startHour.toString().padStart(2, '0')}:00 → Dia ${localOverride.endDay} às ${localOverride.endHour.toString().padStart(2, '0')}:00`}
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Cenários Predefinidos
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setLocalOverride((prev) => ({
                      ...prev,
                      enabled: true,
                      precip_mm: preset.precip_mm,
                      wind_kmh: preset.wind_kmh,
                      gust_kmh: preset.gust_kmh,
                      temp_c: preset.temp_c,
                    }))
                  }
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Manual Inputs */}
          <div className="space-y-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Valores Manuais
            </Label>

            {/* Precipitation */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CloudRain className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm">Precipitação (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={localOverride.precip_mm}
                  onChange={(e) =>
                    setLocalOverride((prev) => ({
                      ...prev,
                      precip_mm: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>

            {/* Wind */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Wind className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm">Vento (km/h)</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={localOverride.wind_kmh}
                  onChange={(e) =>
                    setLocalOverride((prev) => ({
                      ...prev,
                      wind_kmh: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>

            {/* Gust */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Wind className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm">Rajada (km/h)</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={localOverride.gust_kmh}
                  onChange={(e) =>
                    setLocalOverride((prev) => ({
                      ...prev,
                      gust_kmh: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Thermometer className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-sm">Temperatura (°C)</Label>
                <Input
                  type="number"
                  min={-10}
                  max={50}
                  step={1}
                  value={localOverride.temp_c}
                  onChange={(e) =>
                    setLocalOverride((prev) => ({
                      ...prev,
                      temp_c: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={handleReset}>
            Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>Aplicar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
