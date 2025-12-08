import { Cloud, MapPin, Zap, Clock } from "lucide-react";
import { PlanningConfig, BASES } from "@/data/mockPlanningData";
import { ConfigurationForm } from "@/components/ConfigurationForm";
import { useEffect, useState } from "react";

interface HeaderProps {
  config: PlanningConfig;
  onConfigChange: (config: PlanningConfig) => void;
  onCalculate: () => void;
}

export const Header = ({ config, onConfigChange, onCalculate }: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedBase = BASES.find((b) => b.id === config.base);

  return (
    <header className="glass-card p-4 mb-6 animate-slide-up">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 glow-primary">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Planejamento Operacional
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {selectedBase?.name || "Selecione uma base"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="w-5 h-5" />
            <span className="text-sm">OpenWeather API</span>
            <span className="status-indicator bg-success" />
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
        </div>
      </div>
    </header>
  );
};
