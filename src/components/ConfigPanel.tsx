import { SimulationConfig } from "@/hooks/useSimulation";
import { Settings, Users, Clock } from "lucide-react";

interface ConfigPanelProps {
  config: SimulationConfig;
}

export const ConfigPanel = ({ config }: ConfigPanelProps) => {
  // Calculate teams summary by period
  const teamsSummary = {
    madrugada: config.teamsPerHour.slice(0, 6).reduce((a, b) => a + b, 0),
    manha: config.teamsPerHour.slice(6, 12).reduce((a, b) => a + b, 0),
    tarde: config.teamsPerHour.slice(12, 18).reduce((a, b) => a + b, 0),
    noite: config.teamsPerHour.slice(18, 24).reduce((a, b) => a + b, 0),
  };

  return (
    <div className="glass-card p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Configurações Ativas
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Backlog BT</p>
            <p className="font-mono text-lg font-semibold text-primary">
              {config.btInitialBacklog}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Backlog MT</p>
            <p className="font-mono text-lg font-semibold text-purple-400">
              {config.mtInitialBacklog}
            </p>
          </div>
        </div>

        <div className="border-t border-border/30 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Horizonte
            </p>
          </div>
          <p className="font-mono text-lg font-semibold">
            {config.horizonHours} horas
          </p>
        </div>

        <div className="border-t border-border/30 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Equipes por Período
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 rounded bg-blue-500/10">
              <p className="text-xs text-blue-400">Madrugada</p>
              <p className="font-mono font-semibold">{teamsSummary.madrugada}</p>
            </div>
            <div className="text-center p-2 rounded bg-amber-500/10">
              <p className="text-xs text-amber-400">Manhã</p>
              <p className="font-mono font-semibold">{teamsSummary.manha}</p>
            </div>
            <div className="text-center p-2 rounded bg-orange-500/10">
              <p className="text-xs text-orange-400">Tarde</p>
              <p className="font-mono font-semibold">{teamsSummary.tarde}</p>
            </div>
            <div className="text-center p-2 rounded bg-purple-500/10">
              <p className="text-xs text-purple-400">Noite</p>
              <p className="font-mono font-semibold">{teamsSummary.noite}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
