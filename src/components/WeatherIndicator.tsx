import { CloudRain, Wind, Thermometer, AlertTriangle, ChevronRight, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { WeatherTriggersDialog } from "./WeatherTriggersDialog";
import { WeatherMapDialog } from "./WeatherMapDialog";
import { Button } from "@/components/ui/button";
import { useWeatherTriggers, isTriggerActive } from "@/hooks/useWeatherTriggers";

interface WeatherIndicatorProps {
  precip_mm: number;
  wind_kmh: number;
  gust_kmh?: number;
  temp_c: number;
  lat?: number;
  lon?: number;
  baseName?: string;
  baseId?: string | null;
  className?: string;
}

export const WeatherIndicator = ({
  precip_mm,
  wind_kmh,
  gust_kmh,
  temp_c,
  lat,
  lon,
  baseName = "Base",
  baseId = null,
  className,
}: WeatherIndicatorProps) => {
  const [triggersDialogOpen, setTriggersDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  
  // Fetch weather triggers to calculate active count
  const { data: triggers } = useWeatherTriggers(baseId);

  const getRainStatus = (mm: number) => {
    if (mm >= 5) return { label: "Forte", color: "text-destructive" };
    if (mm >= 1) return { label: "Moderada", color: "text-warning" };
    if (mm >= 0.2) return { label: "Fraca", color: "text-primary" };
    return { label: "Seco", color: "text-muted-foreground" };
  };

  const getWindStatus = (kmh: number) => {
    if (kmh >= 36) return { label: "Muito forte", color: "text-destructive" };
    if (kmh >= 22) return { label: "Forte", color: "text-warning" };
    if (kmh >= 14) return { label: "Moderado", color: "text-primary" };
    if (kmh >= 7) return { label: "Leve", color: "text-muted-foreground" };
    return { label: "Fraco", color: "text-muted-foreground" };
  };

  // Calculate active triggers using real database triggers
  const getActiveTriggers = () => {
    if (!triggers) return 0;
    return triggers.filter(trigger => 
      isTriggerActive(trigger, precip_mm, wind_kmh, temp_c, gust_kmh)
    ).length;
  };

  const rainStatus = getRainStatus(precip_mm);
  const windStatus = getWindStatus(wind_kmh);
  const activeTriggers = getActiveTriggers();

  return (
    <>
      <div className={cn("glass-card p-5 animate-slide-up h-full flex flex-col", className)}>
        {/* Header with map button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Condições Climáticas
          </h3>
          <div className="flex items-center gap-2">
            {lat && lon && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-secondary/50 border-border hover:bg-secondary"
                onClick={() => setMapDialogOpen(true)}
              >
                <Map className="w-3.5 h-3.5" />
                Ver Mapa
              </Button>
            )}
            {activeTriggers > 0 && (
              <button
                onClick={() => setTriggersDialogOpen(true)}
                className="flex items-center gap-1 text-warning hover:opacity-80 transition-opacity"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{activeTriggers} gatilho{activeTriggers > 1 ? 's' : ''}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Weather data */}
        <div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 cursor-pointer hover:bg-muted/20 rounded-lg p-2 -m-2 transition-colors"
          onClick={() => setTriggersDialogOpen(true)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CloudRain className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chuva</p>
              <p className="font-mono text-sm font-semibold">{precip_mm.toFixed(1)} mm</p>
              <p className={cn("text-xs", rainStatus.color)}>{rainStatus.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Wind className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vento</p>
              <p className="font-mono text-sm font-semibold">{wind_kmh.toFixed(0)} km/h</p>
              <p className={cn("text-xs", windStatus.color)}>{windStatus.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Thermometer className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Temperatura</p>
              <p className="font-mono text-sm font-semibold">{temp_c.toFixed(1)}°C</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", activeTriggers > 0 ? "bg-warning/10" : "bg-emerald-500/10")}>
              <AlertTriangle className={cn("w-5 h-5", activeTriggers > 0 ? "text-warning" : "text-emerald-400")} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gatilho</p>
              <p className={cn("font-mono text-sm font-semibold", activeTriggers > 0 ? "text-warning" : "text-success")}>
                {activeTriggers > 0 ? "Ativo" : "Inativo"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <WeatherTriggersDialog
        open={triggersDialogOpen}
        onOpenChange={setTriggersDialogOpen}
        precip_mm={precip_mm}
        wind_kmh={wind_kmh}
        gust_kmh={gust_kmh}
        temp_c={temp_c}
        baseId={baseId}
      />

      {lat && lon && (
        <WeatherMapDialog
          open={mapDialogOpen}
          onOpenChange={setMapDialogOpen}
          lat={lat}
          lon={lon}
          baseName={baseName}
        />
      )}
    </>
  );
};
