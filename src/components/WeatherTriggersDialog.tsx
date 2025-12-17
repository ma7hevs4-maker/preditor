import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WeatherTriggersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  precip_mm: number;
  wind_ms: number;
  temp_c: number;
}

interface Trigger {
  name: string;
  condition: string;
  impact: string;
  description: string;
  isActive: boolean;
}

export const WeatherTriggersDialog = ({
  open,
  onOpenChange,
  precip_mm,
  wind_ms,
  temp_c,
}: WeatherTriggersDialogProps) => {
  const [showAllTriggers, setShowAllTriggers] = useState(false);

  const allTriggers: Trigger[] = [
    {
      name: "Chuva Fraca",
      condition: "Precipitação ≥ 0.2 mm",
      impact: "+15%",
      description: "Aumento de 15% nas ocorrências de curto-circuito",
      isActive: precip_mm >= 0.2 && precip_mm < 1,
    },
    {
      name: "Chuva Moderada",
      condition: "Precipitação ≥ 1 mm",
      impact: "+35%",
      description: "Aumento de 35% nas ocorrências de curto-circuito",
      isActive: precip_mm >= 1 && precip_mm < 5,
    },
    {
      name: "Chuva Forte",
      condition: "Precipitação ≥ 5 mm",
      impact: "+60%",
      description: "Aumento de 60% nas ocorrências de curto-circuito",
      isActive: precip_mm >= 5,
    },
    {
      name: "Vento Moderado",
      condition: "Vento ≥ 4 m/s",
      impact: "+10%",
      description: "Aumento de 10% em quedas de árvores sobre rede",
      isActive: wind_ms >= 4 && wind_ms < 6,
    },
    {
      name: "Vento Forte",
      condition: "Vento ≥ 6 m/s",
      impact: "+25%",
      description: "Aumento de 25% em quedas de árvores sobre rede",
      isActive: wind_ms >= 6 && wind_ms < 10,
    },
    {
      name: "Vento Muito Forte",
      condition: "Vento ≥ 10 m/s",
      impact: "+50%",
      description: "Aumento de 50% em quedas de árvores sobre rede",
      isActive: wind_ms >= 10,
    },
    {
      name: "Calor Extremo",
      condition: "Temperatura ≥ 35°C",
      impact: "+20%",
      description: "Aumento de 20% em sobrecarga de transformadores",
      isActive: temp_c >= 35,
    },
    {
      name: "Frio Intenso",
      condition: "Temperatura ≤ 10°C",
      impact: "+10%",
      description: "Aumento de 10% em falhas de equipamentos",
      isActive: temp_c <= 10,
    },
  ];

  const activeTriggers = allTriggers.filter((t) => t.isActive);

  const totalImpact = activeTriggers.reduce((acc, t) => {
    const value = parseInt(t.impact.replace(/[^0-9]/g, ""));
    return acc + value;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Gatilhos Climáticos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Gatilhos Ativos</p>
              <p className="text-2xl font-bold text-warning">{activeTriggers.length}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Impacto Total</p>
              <p className="text-2xl font-bold text-destructive">+{totalImpact}%</p>
            </div>
          </div>

          {/* Active Triggers */}
          {activeTriggers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gatilhos Ativos
              </h4>
              <div className="space-y-2">
                {activeTriggers.map((trigger) => (
                  <div
                    key={trigger.name}
                    className="bg-warning/10 border border-warning/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{trigger.name}</span>
                      <span className="text-xs font-bold bg-warning/20 text-warning px-2 py-1 rounded">
                        {trigger.impact}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{trigger.condition}</p>
                    <p className="text-xs text-muted-foreground">{trigger.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTriggers.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum gatilho climático ativo no momento
            </div>
          )}

          {/* All Triggers Collapsible */}
          <Collapsible open={showAllTriggers} onOpenChange={setShowAllTriggers}>
            <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span>Ver todos os gatilhos configurados</span>
              {showAllTriggers ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border border-border rounded-lg overflow-hidden mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Gatilho</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Condição</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Impacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTriggers.map((trigger, index) => (
                      <tr
                        key={trigger.name}
                        className={cn(
                          index % 2 === 0 ? "bg-background" : "bg-muted/20",
                          trigger.isActive && "bg-warning/10 border-l-2 border-l-warning"
                        )}
                      >
                        <td className={cn("px-3 py-2", trigger.isActive ? "text-warning font-semibold" : "text-foreground")}>
                          {trigger.name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{trigger.condition}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn("font-semibold", trigger.isActive ? "text-warning" : "text-muted-foreground")}>
                            {trigger.impact}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
};
