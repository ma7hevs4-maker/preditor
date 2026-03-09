import { useState, useMemo } from "react";
import { CloudSun, CloudRain, Wind, Thermometer, AlertTriangle, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useBases, Base } from "@/hooks/useBases";
import { useWeather, WeatherHour } from "@/hooks/useWeather";
import { useWeatherProvider } from "@/hooks/useWeatherProvider";
import { useWeatherTriggers, isTriggerActive, WeatherTrigger } from "@/hooks/useWeatherTriggers";
import { REGIONAIS } from "@/data/basesConfig";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// UTS and UTN grouping
const UTN_REGIONAIS = ["Campos", "Macaé", "Lagos", "Noroeste"];
const UTS_REGIONAIS = ["Magé", "Niterói", "São Gonçalo", "Serrana", "Sul"];

interface BaseWeatherData {
  base: Base;
  forecast: WeatherHour[] | null;
  isLoading: boolean;
}

function BaseWeatherFetcher({ base, provider, onData }: { base: Base; provider: "openmeteo" | "openweathermap"; onData: (data: BaseWeatherData) => void }) {
  const { data, isLoading } = useWeather(base.lat, base.lon, 96, provider);
  
  useMemo(() => {
    onData({ base, forecast: data?.forecast ?? null, isLoading });
  }, [data, isLoading]);
  
  return null;
}

// Component that fetches weather for a single base and renders its card
function BaseWeatherCard({ base, provider, selectedDay }: { base: Base; provider: "openmeteo" | "openweathermap"; selectedDay: Date }) {
  const { data, isLoading } = useWeather(base.lat, base.lon, 96, provider);
  const { data: triggers } = useWeatherTriggers(base.id);

  const dayHours = useMemo(() => {
    if (!data?.forecast) return [];
    return data.forecast.filter(h => {
      const dt = new Date(h.datetime);
      return isSameDay(dt, selectedDay);
    });
  }, [data?.forecast, selectedDay]);

  // Calculate active triggers per hour
  const triggerAnalysis = useMemo(() => {
    if (!triggers || dayHours.length === 0) return { activeTriggers: [], maxConsecutive: 0, totalActiveHours: 0 };

    const hourTriggers = dayHours.map(h => {
      const active = triggers.filter(t => isTriggerActive(t, h.precip_mm, h.wind_kmh, h.temp_c, h.gust_kmh));
      return { hour: h, activeTriggers: active };
    });

    // Unique active triggers across day
    const allActiveIds = new Set<string>();
    let totalActiveHours = 0;
    hourTriggers.forEach(ht => {
      if (ht.activeTriggers.length > 0) totalActiveHours++;
      ht.activeTriggers.forEach(t => allActiveIds.add(t.id));
    });

    // Count consecutive hours with any trigger
    let maxConsecutive = 0;
    let current = 0;
    hourTriggers.forEach(ht => {
      if (ht.activeTriggers.length > 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    });

    // Get unique triggers with their active hour count
    const triggerHourMap = new Map<string, { trigger: WeatherTrigger; hours: number }>();
    hourTriggers.forEach(ht => {
      ht.activeTriggers.forEach(t => {
        const existing = triggerHourMap.get(t.id);
        if (existing) {
          existing.hours++;
        } else {
          triggerHourMap.set(t.id, { trigger: t, hours: 1 });
        }
      });
    });

    return {
      activeTriggers: Array.from(triggerHourMap.values()),
      maxConsecutive,
      totalActiveHours
    };
  }, [triggers, dayHours]);

  // Day summary
  const summary = useMemo(() => {
    if (dayHours.length === 0) return null;
    const maxPrecip = Math.max(...dayHours.map(h => h.precip_mm));
    const totalPrecip = dayHours.reduce((s, h) => s + h.precip_mm, 0);
    const maxWind = Math.max(...dayHours.map(h => h.wind_kmh));
    const maxGust = Math.max(...dayHours.map(h => h.gust_kmh ?? 0));
    const minTemp = Math.min(...dayHours.map(h => h.temp_c));
    const maxTemp = Math.max(...dayHours.map(h => h.temp_c));
    return { maxPrecip, totalPrecip, maxWind, maxGust, minTemp, maxTemp };
  }, [dayHours]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <h4 className="text-sm font-semibold text-foreground">{base.name}</h4>
        <p className="text-xs text-muted-foreground mt-2">Sem dados disponíveis</p>
      </div>
    );
  }

  const hasActiveTriggers = triggerAnalysis.totalActiveHours > 0;

  return (
    <div className={cn(
      "rounded-xl border bg-card/50 p-4 transition-all hover:bg-card/80",
      hasActiveTriggers ? "border-warning/40" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-foreground">{base.name}</h4>
        {hasActiveTriggers && (
          <Badge variant="outline" className="text-[10px] border-warning/50 text-warning bg-warning/10">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {triggerAnalysis.totalActiveHours}h ativos
          </Badge>
        )}
      </div>

      {/* Weather metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CloudRain className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Chuva acum.</p>
            <p className="text-xs font-mono font-semibold text-foreground">{summary.totalPrecip.toFixed(1)} mm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Máx/h</p>
            <p className="text-xs font-mono font-semibold text-foreground">{summary.maxPrecip.toFixed(1)} mm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Vento máx</p>
            <p className="text-xs font-mono font-semibold text-foreground">{summary.maxWind.toFixed(0)} km/h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Rajada máx</p>
            <p className="text-xs font-mono font-semibold text-foreground">{summary.maxGust.toFixed(0)} km/h</p>
          </div>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <Thermometer className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Temperatura</p>
            <p className="text-xs font-mono font-semibold text-foreground">{summary.minTemp.toFixed(0)}° — {summary.maxTemp.toFixed(0)}°C</p>
          </div>
        </div>
      </div>

      {/* Hourly rain bar chart mini */}
      <div className="mb-3">
        <p className="text-[10px] text-muted-foreground mb-1">Chuva hora a hora</p>
        <div className="flex items-end gap-[2px] h-8">
          {dayHours.map((h, i) => {
            const maxP = Math.max(summary.maxPrecip, 1);
            const height = Math.max((h.precip_mm / maxP) * 100, h.precip_mm > 0 ? 8 : 0);
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all"
                style={{
                  height: `${height}%`,
                  backgroundColor: h.precip_mm >= 10 ? 'hsl(0, 72%, 51%)' :
                    h.precip_mm >= 6 ? 'hsl(38, 92%, 50%)' :
                    h.precip_mm >= 3 ? 'hsl(200, 90%, 40%)' :
                    h.precip_mm >= 0.2 ? 'hsl(200, 70%, 60%)' : 'hsl(var(--muted))',
                  minHeight: h.precip_mm > 0 ? '2px' : '0px'
                }}
                title={`${h.hour}h: ${h.precip_mm.toFixed(1)}mm`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px] text-muted-foreground">0h</span>
          <span className="text-[8px] text-muted-foreground">12h</span>
          <span className="text-[8px] text-muted-foreground">23h</span>
        </div>
      </div>

      {/* Active triggers */}
      {triggerAnalysis.activeTriggers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium">Gatilhos ativados:</p>
          {triggerAnalysis.activeTriggers.map(({ trigger, hours }) => (
            <div key={trigger.id} className="flex items-center justify-between text-[10px] bg-warning/5 rounded px-2 py-1">
              <span className="text-warning font-medium truncate mr-2">{trigger.name}</span>
              <span className="text-muted-foreground whitespace-nowrap">{hours}h</span>
            </div>
          ))}
          {triggerAnalysis.maxConsecutive > 1 && (
            <p className="text-[10px] text-muted-foreground">
              Máx consecutivo: <span className="font-semibold text-warning">{triggerAnalysis.maxConsecutive}h</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function UTGroupSection({ title, regionais, allBases, provider, selectedDay }: {
  title: string;
  regionais: string[];
  allBases: Base[];
  provider: "openmeteo" | "openweathermap";
  selectedDay: Date;
}) {
  // Build list of bases for this UT
  const basesInGroup = useMemo(() => {
    const result: { regional: string; bases: Base[] }[] = [];
    regionais.forEach(regLabel => {
      const regional = REGIONAIS.find(r => r.label === regLabel);
      if (!regional) return;

      if (regional.sucursais.length === 0) {
        const base = allBases.find(b => b.name.toLowerCase() === regional.label.toLowerCase());
        if (base) result.push({ regional: regLabel, bases: [base] });
      } else {
        const bases = regional.sucursais
          .map(s => allBases.find(b => b.name.toLowerCase() === s.name.toLowerCase()))
          .filter((b): b is Base => !!b);
        if (bases.length > 0) result.push({ regional: regLabel, bases });
      }
    });
    return result;
  }, [regionais, allBases]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>

      {basesInGroup.map(({ regional, bases }) => (
        <div key={regional} className="space-y-2">
          {bases.length > 1 && (
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
              {regional}
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {bases.map(base => (
              <BaseWeatherCard
                key={base.id}
                base={base}
                provider={provider}
                selectedDay={selectedDay}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Clima() {
  const { data: bases, isLoading: basesLoading } = useBases();
  const { provider } = useWeatherProvider();
  const [dayOffset, setDayOffset] = useState(0);

  const today = startOfDay(new Date());
  const selectedDay = addDays(today, dayOffset);
  const maxDays = 3; // up to 3 days ahead (96h)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CloudSun className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Central Climática</h1>
            <p className="text-xs text-muted-foreground">Previsão meteorológica de todas as bases</p>
          </div>
        </div>

        {/* Day selector */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={dayOffset <= 0}
            onClick={() => setDayOffset(d => d - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5 px-2 min-w-[140px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {dayOffset === 0 ? "Hoje" : dayOffset === 1 ? "Amanhã" : format(selectedDay, "EEE, dd/MM", { locale: ptBR })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={dayOffset >= maxDays}
            onClick={() => setDayOffset(d => d + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day navigation pills */}
      <div className="flex gap-2">
        {Array.from({ length: maxDays + 1 }, (_, i) => {
          const day = addDays(today, i);
          const label = i === 0 ? "Hoje" : i === 1 ? "Amanhã" : format(day, "EEE dd", { locale: ptBR });
          return (
            <Button
              key={i}
              variant={dayOffset === i ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setDayOffset(i)}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {basesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/50 p-4 animate-pulse h-48" />
          ))}
        </div>
      ) : bases && bases.length > 0 ? (
        <div className="space-y-8">
          <UTGroupSection
            title="UTN — Unidade Técnica Norte"
            regionais={UTN_REGIONAIS}
            allBases={bases}
            provider={provider}
            selectedDay={selectedDay}
          />
          <UTGroupSection
            title="UTS — Unidade Técnica Sul"
            regionais={UTS_REGIONAIS}
            allBases={bases}
            provider={provider}
            selectedDay={selectedDay}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CloudSun className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma base cadastrada</p>
        </div>
      )}
    </div>
  );
}
