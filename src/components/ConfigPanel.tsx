import { SimulationConfig } from "@/hooks/useSimulation";
import { Settings, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigPanelProps {
  config: SimulationConfig;
}

const turnos = [
  { id: "A", name: "Turno A", range: [0, 1, 2, 3, 4, 5, 6, 7], colorClass: "text-blue-400 bg-blue-500/10" },
  { id: "B", name: "Turno B", range: [8, 9, 10, 11, 12, 13, 14, 15], colorClass: "text-amber-400 bg-amber-500/10" },
  { id: "C", name: "Turno C", range: [16, 17, 18, 19, 20, 21, 22, 23], colorClass: "text-purple-400 bg-purple-500/10" },
];

export const ConfigPanel = ({ config }: ConfigPanelProps) => {
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
              Equipes por Turno
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {turnos.map((turno) => {
              const totalTurno = turno.range.reduce((sum, h) => sum + config.teamsPerHour[h], 0);
              return (
                <div key={turno.id} className={cn("text-center p-2 rounded", turno.colorClass)}>
                  <p className="text-xs">{turno.name}</p>
                  <p className="font-mono font-semibold">{totalTurno}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
