import { Cloud, MapPin, Zap, Clock } from "lucide-react";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { AdminConfigDialog } from "@/components/AdminConfigDialog";
import { useEffect, useState } from "react";
import { SimulationConfig } from "@/hooks/useSimulation";
import { Base } from "@/hooks/useBases";
interface HeaderProps {
  config: SimulationConfig;
  selectedBase: Base | undefined;
  onConfigChange: (config: SimulationConfig) => void;
  onCalculate: () => void;
  weatherStatus?: "loading" | "success" | "error";
}

export const Header = ({ config, selectedBase, onConfigChange, onCalculate, weatherStatus = "success" }: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="glass-card p-4 mb-6 animate-slide-up">
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="w-5 h-5" />
            <span className="text-sm">Previsão do Tempo</span>
            <span className={`status-indicator ${
              weatherStatus === "loading" ? "bg-warning animate-pulse" :
              weatherStatus === "error" ? "bg-destructive" : "bg-success"
            }`} />
          </div>

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
          />

          <AdminConfigDialog />
        </div>
      </div>
    </header>
  );
};
