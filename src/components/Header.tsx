import { Cloud, MapPin, Zap, Clock, CloudOff, CloudLightning, SlidersHorizontal } from "lucide-react";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { SimulationHistoryDialog } from "@/components/SimulationHistoryDialog";
import { WeatherOverrideDialog, WeatherOverride } from "@/components/WeatherOverrideDialog";
import { OperationalOverrideDialog, OperationalOverride } from "@/components/OperationalOverrideDialog";
import { ContingencyLevelIndicator } from "@/components/ContingencyLevelIndicator";
import { useEffect, useState } from "react";
import { SimulationConfig } from "@/hooks/useSimulation";
import { Base } from "@/hooks/useBases";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WeatherProvider } from "@/hooks/useWeatherProvider";
import { SimulationHistoryEntry } from "@/hooks/useSimulationHistory";
import { cn } from "@/lib/utils";


interface HeaderProps {
  config: SimulationConfig;
  selectedBase: Base | undefined;
  onConfigChange: (config: SimulationConfig) => void;
  onCalculate: () => void;
  weatherStatus?: "loading" | "success" | "error";
  weatherProvider?: WeatherProvider;
  onWeatherProviderChange?: (provider: WeatherProvider) => void;
  weatherImpactEnabled?: boolean;
  onWeatherImpactChange?: (enabled: boolean) => void;
  onLoadSimulation?: (entry: SimulationHistoryEntry) => void;
  onSaveSimulation?: () => void;
  isSaving?: boolean;
  weatherOverride?: WeatherOverride;
  onWeatherOverrideChange?: (override: WeatherOverride) => void;
  operationalOverride?: OperationalOverride;
  onOperationalOverrideChange?: (override: OperationalOverride) => void;
  totalIncidents?: number;
}

export const Header = ({ 
  config, 
  selectedBase, 
  onConfigChange, 
  onCalculate, 
  weatherStatus = "success", 
  weatherProvider = "openmeteo", 
  onWeatherProviderChange, 
  weatherImpactEnabled = true, 
  onWeatherImpactChange,
  onLoadSimulation,
  onSaveSimulation,
  isSaving,
  weatherOverride,
  onWeatherOverrideChange,
  operationalOverride,
  onOperationalOverrideChange,
  totalIncidents = 0
}: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherOverrideOpen, setWeatherOverrideOpen] = useState(false);
  const [operationalOverrideOpen, setOperationalOverrideOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="glass-card p-4 mb-6 animate-slide-up relative z-50">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 glow-primary">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Preditor de Incidentes
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {selectedBase?.name || "Selecione uma base"}
              {selectedBase && (
                <span className="text-xs opacity-60">
                  ({selectedBase.lat.toFixed(3)}, {selectedBase.lon.toFixed(3)})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Contingency Level Indicator */}
          {selectedBase && totalIncidents > 0 && (
            <ContingencyLevelIndicator
              baseName={selectedBase.name}
              totalIncidents={totalIncidents}
            />
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="w-5 h-5" />
            <span className="text-sm">Previsão do Tempo</span>
            <span className={`status-indicator ${
              weatherStatus === "loading" ? "bg-warning animate-pulse" :
              weatherStatus === "error" ? "bg-destructive" : "bg-success"
            }`} />
          </div>

          {/* Weather Impact Toggle */}
          {onWeatherImpactChange && (
            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
              <CloudOff className={`w-4 h-4 transition-colors ${!weatherImpactEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <Switch
                checked={weatherImpactEnabled}
                onCheckedChange={onWeatherImpactChange}
                className="data-[state=checked]:bg-primary"
              />
              <Cloud className={`w-4 h-4 transition-colors ${weatherImpactEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium text-muted-foreground">Impacto</span>
            </div>
          )}

          {/* Simulate Weather Button - Icon only */}
          {onWeatherOverrideChange && weatherOverride && (
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "bg-secondary/50 border-border hover:bg-secondary",
                weatherOverride.enabled && "border-warning text-warning hover:text-warning"
              )}
              onClick={() => setWeatherOverrideOpen(true)}
              title={weatherOverride.enabled ? "Clima Simulado (ativo)" : "Simular Clima"}
            >
              <CloudLightning className="w-4 h-4" />
            </Button>
          )}

          {/* Simulate Operational Button - Icon only */}
          {onOperationalOverrideChange && operationalOverride && (
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "bg-secondary/50 border-border hover:bg-secondary",
                operationalOverride.enabled && "border-primary text-primary hover:text-primary"
              )}
              onClick={() => setOperationalOverrideOpen(true)}
              title={operationalOverride.enabled ? "Operacional Simulado (ativo)" : "Simular Operacional"}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          )}

          {/* Weather Provider Switch */}
          {onWeatherProviderChange && (
            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg">
              <span className={`text-xs font-medium transition-colors ${weatherProvider === "openmeteo" ? "text-primary" : "text-muted-foreground"}`}>
                Open-Meteo
              </span>
              <Switch
                checked={weatherProvider === "openweathermap"}
                onCheckedChange={(checked) => onWeatherProviderChange(checked ? "openweathermap" : "openmeteo")}
                className="data-[state=checked]:bg-primary"
              />
              <span className={`text-xs font-medium transition-colors ${weatherProvider === "openweathermap" ? "text-primary" : "text-muted-foreground"}`}>
                OpenWeather
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-sm font-medium">Horizonte:</span>
            <span className="font-mono text-primary">{config.horizonHours}h</span>
          </div>

          <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5 text-primary" />
            <div className="font-mono text-lg font-semibold">
              {currentTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>

          <ConfigurationForm
            config={config}
            onConfigChange={onConfigChange}
            onCalculate={onCalculate}
            onSave={onSaveSimulation}
            isSaving={isSaving}
          />

          <SimulationHistoryDialog
            baseId={config.regionalLabel ? undefined : selectedBase?.id}
            regionalLabel={config.regionalLabel}
            onLoadSimulation={onLoadSimulation}
          />
        </div>
      </div>

      {/* Weather Override Dialog */}
      {onWeatherOverrideChange && weatherOverride && (
        <WeatherOverrideDialog
          open={weatherOverrideOpen}
          onOpenChange={setWeatherOverrideOpen}
          override={weatherOverride}
          onOverrideChange={onWeatherOverrideChange}
          horizonHours={config.horizonHours}
        />
      )}

      {/* Operational Override Dialog */}
      {onOperationalOverrideChange && operationalOverride && (
        <OperationalOverrideDialog
          open={operationalOverrideOpen}
          onOpenChange={setOperationalOverrideOpen}
          override={operationalOverride}
          onOverrideChange={onOperationalOverrideChange}
          horizonHours={config.horizonHours}
        />
      )}
    </header>
  );
};
