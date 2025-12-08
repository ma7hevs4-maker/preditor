import { CloudRain, Wind, Thermometer, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherIndicatorProps {
  precip_mm: number;
  wind_ms: number;
  temp_c: number;
  className?: string;
}

export const WeatherIndicator = ({
  precip_mm,
  wind_ms,
  temp_c,
  className,
}: WeatherIndicatorProps) => {
  const getRainStatus = (mm: number) => {
    if (mm >= 5) return { label: "Forte", color: "text-destructive" };
    if (mm >= 1) return { label: "Moderada", color: "text-warning" };
    if (mm >= 0.2) return { label: "Fraca", color: "text-primary" };
    return { label: "Seco", color: "text-muted-foreground" };
  };

  const getWindStatus = (ms: number) => {
    if (ms >= 10) return { label: "Muito forte", color: "text-destructive" };
    if (ms >= 6) return { label: "Forte", color: "text-warning" };
    if (ms >= 4) return { label: "Moderado", color: "text-primary" };
    return { label: "Fraco", color: "text-muted-foreground" };
  };

  const rainStatus = getRainStatus(precip_mm);
  const windStatus = getWindStatus(wind_ms);

  return (
    <div className={cn("glass-card p-5 animate-slide-up", className)}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Condições Climáticas
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <CloudRain className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chuva</p>
            <p className="font-mono text-sm font-semibold">{precip_mm} mm</p>
            <p className={cn("text-xs", rainStatus.color)}>{rainStatus.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Wind className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vento</p>
            <p className="font-mono text-sm font-semibold">{wind_ms} m/s</p>
            <p className={cn("text-xs", windStatus.color)}>{windStatus.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Thermometer className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Temperatura</p>
            <p className="font-mono text-sm font-semibold">{temp_c}°C</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Droplets className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gatilho</p>
            <p className={cn("font-mono text-sm font-semibold", precip_mm >= 0.2 ? "text-warning" : "text-success")}>
              {precip_mm >= 0.2 ? "Ativo" : "Inativo"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
