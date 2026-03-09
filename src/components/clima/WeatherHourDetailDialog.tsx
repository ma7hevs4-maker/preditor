import { Clock, CloudRain, Wind, Thermometer, Droplets, AlertTriangle, TrendingUp, TrendingDown, Users, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WeatherHour } from "@/hooks/useWeather";
import { WeatherTrigger } from "@/hooks/useWeatherTriggers";
import { HistoricalDataRow } from "@/hooks/useHistoricalData";
import { translateWeatherDescription } from "@/utils/weatherTranslations";

interface WeatherHourDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hour: WeatherHour | null;
  activeTriggers: WeatherTrigger[];
  historicalData: HistoricalDataRow | null;
  baseName: string;
}

function getTriggerColor(trigger: WeatherTrigger) {
  const name = trigger.name.toLowerCase();
  if (name.includes("muito forte")) return "text-destructive bg-destructive/10 border-destructive/30";
  if (name.includes("forte")) return "text-warning bg-warning/10 border-warning/30";
  if (name.includes("moderada") || name.includes("moderado")) return "text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/30";
  if (name.includes("fraca") || name.includes("leve")) return "text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
  if (name.includes("frio")) return "text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
  return "text-warning bg-warning/10 border-warning/30";
}

export function WeatherHourDetailDialog({
  open,
  onOpenChange,
  hour,
  activeTriggers,
  historicalData,
  baseName,
}: WeatherHourDetailDialogProps) {
  if (!hour) return null;

  // Calculate total uplift from active triggers
  let upliftBT = 0;
  let upliftMT = 0;
  for (const t of activeTriggers) {
    upliftBT += (t.impact_percent_bt ?? t.impact_percent ?? 0);
    upliftMT += (t.impact_percent_mt ?? t.impact_percent ?? 0);
  }
  const hasUplift = upliftBT > 0 || upliftMT > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-primary" />
            {baseName} — {String(hour.hour).padStart(2, "0")}:00
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Weather conditions */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condições Meteorológicas</h4>
            <div className="flex items-center gap-2 mb-2">
              <img
                src={`https://openweathermap.org/img/wn/${hour.icon}@2x.png`}
                alt={hour.description}
                className="w-10 h-10"
              />
              <span className="text-sm font-medium text-foreground capitalize">
                {translateWeatherDescription(hour.description)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Temperatura</p>
                  <p className="text-sm font-mono font-bold text-foreground">{hour.temp_c.toFixed(1)}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                <CloudRain className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Precipitação</p>
                  <p className="text-sm font-mono font-bold text-foreground">{hour.precip_mm.toFixed(1)} mm</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                <Wind className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Vento</p>
                  <p className="text-sm font-mono font-bold text-foreground">{hour.wind_kmh.toFixed(0)} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
                <Wind className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Rajada</p>
                  <p className="text-sm font-mono font-bold text-foreground">{hour.gust_kmh?.toFixed(0) ?? "—"} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5 col-span-2">
                <Droplets className="w-4 h-4 text-blue-300" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Umidade</p>
                  <p className="text-sm font-mono font-bold text-foreground">{hour.humidity}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active triggers */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gatilhos neste horário
              </h4>
              <Badge variant="outline" className={cn(
                "text-[10px] ml-auto",
                activeTriggers.length > 0 ? "text-warning border-warning/50" : "text-muted-foreground"
              )}>
                {activeTriggers.length} ativo{activeTriggers.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {activeTriggers.length > 0 ? (
              <div className="space-y-1.5">
                {activeTriggers.map(t => {
                  const color = getTriggerColor(t);
                  return (
                    <div key={t.id} className={cn("rounded-md border px-3 py-2", color)}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{t.name}</span>
                        <div className="flex gap-1.5">
                          {t.impact_percent_bt != null && (
                            <span className="text-[10px] font-mono font-bold">BT +{t.impact_percent_bt}%</span>
                          )}
                          {t.impact_percent_mt != null && (
                            <span className="text-[10px] font-mono font-bold">MT +{t.impact_percent_mt}%</span>
                          )}
                        </div>
                      </div>
                      {t.description && (
                        <p className="text-[10px] opacity-80 mt-0.5">{t.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum gatilho ativo</p>
            )}
          </div>

          {/* Historical data */}
          {historicalData && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dados Históricos {hasUplift ? "& Ajustados" : ""} — {String(hour.hour).padStart(2, "0")}h
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* BT column */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase">Baixa Tensão</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Entrada</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-foreground">{historicalData.bt_entry_rate.toFixed(1)}</span>
                        {upliftBT > 0 && (
                          <span className="text-[10px] font-mono font-bold text-warning">
                            → {(historicalData.bt_entry_rate * (1 + upliftBT / 100)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Ret. Operador</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-foreground">{historicalData.bt_operator_removal.toFixed(1)}</span>
                        {upliftBT > 0 && (
                          <span className="text-[10px] font-mono font-bold text-warning">
                            → {(historicalData.bt_operator_removal * (1 + upliftBT / 100)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Produtividade</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground">{historicalData.bt_productivity.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {/* MT column */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-orange-500 dark:text-orange-400 uppercase">Média Tensão</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Entrada</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-foreground">{historicalData.mt_entry_rate.toFixed(1)}</span>
                        {upliftMT > 0 && (
                          <span className="text-[10px] font-mono font-bold text-warning">
                            → {(historicalData.mt_entry_rate * (1 + upliftMT / 100)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Ret. Operador</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-foreground">{historicalData.mt_operator_removal.toFixed(1)}</span>
                        {upliftMT > 0 && (
                          <span className="text-[10px] font-mono font-bold text-warning">
                            → {(historicalData.mt_operator_removal * (1 + upliftMT / 100)).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Produtividade</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground">{historicalData.mt_productivity.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
