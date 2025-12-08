import { PlanningConfig } from "@/data/mockPlanningData";
import { Settings, Users, Gauge } from "lucide-react";

interface ConfigPanelProps {
  config: PlanningConfig;
}

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
              {config.backlog_bt}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Backlog MT</p>
            <p className="font-mono text-lg font-semibold text-purple-400">
              {config.backlog_mt}
            </p>
          </div>
        </div>

        <div className="border-t border-border/30 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Equipes por Turno
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(["A", "B", "C"] as const).map((turno) => (
              <div key={turno} className="text-center p-2 rounded bg-secondary/30">
                <p className="text-xs text-muted-foreground">Turno {turno}</p>
                <p className="font-mono">
                  <span className="text-primary">{config.equipes_bt[turno]}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-purple-400">{config.equipes_mt[turno]}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/30 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Produtividade
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Prod. BT</p>
              <p className="font-mono font-semibold">{config.prod_bt}/turno</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prod. MT</p>
              <p className="font-mono font-semibold">{config.prod_mt}/turno</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
