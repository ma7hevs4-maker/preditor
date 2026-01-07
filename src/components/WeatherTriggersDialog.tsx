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
import { useWeatherTriggers, isTriggerActive, WeatherTrigger } from "@/hooks/useWeatherTriggers";

interface WeatherTriggersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  precip_mm: number;
  wind_ms: number;
  temp_c: number;
  baseId?: string | null;
}

export const WeatherTriggersDialog = ({
  open,
  onOpenChange,
  precip_mm,
  wind_ms,
  temp_c,
  baseId = null,
}: WeatherTriggersDialogProps) => {
  const [showAllTriggers, setShowAllTriggers] = useState(false);
  const { data: triggers } = useWeatherTriggers(baseId);

  const getConditionText = (trigger: WeatherTrigger) => {
    const type = trigger.trigger_type;
    const min = trigger.condition_min;
    const max = trigger.condition_max;
    
    let unit = "";
    switch (type) {
      case "precip": unit = "mm"; break;
      case "wind": unit = "m/s"; break;
      case "temp": unit = "°C"; break;
    }

    if (min !== null && max !== null) {
      return `${min} - ${max} ${unit}`;
    } else if (min !== null) {
      return `≥ ${min} ${unit}`;
    } else if (max !== null) {
      return `≤ ${max} ${unit}`;
    }
    return "-";
  };

  const allTriggers = triggers?.map(trigger => ({
    ...trigger,
    condition: getConditionText(trigger),
    isActive: isTriggerActive(trigger, precip_mm, wind_ms, temp_c),
  })) || [];

  const activeTriggers = allTriggers.filter((t) => t.isActive);

  // Calculate total impact for BT and MT separately
  const totalImpactBT = activeTriggers.reduce((acc, t) => {
    return acc + (t.impact_percent_bt ?? t.impact_percent ?? 0);
  }, 0);

  const totalImpactMT = activeTriggers.reduce((acc, t) => {
    return acc + (t.impact_percent_mt ?? t.impact_percent ?? 0);
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Gatilhos Ativos</p>
              <p className="text-2xl font-bold text-warning">{activeTriggers.length}</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4">
              <p className="text-xs text-blue-400">Impacto BT</p>
              <p className="text-2xl font-bold text-blue-400">+{totalImpactBT.toFixed(0)}%</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-4">
              <p className="text-xs text-orange-400">Impacto MT</p>
              <p className="text-2xl font-bold text-orange-400">+{totalImpactMT.toFixed(0)}%</p>
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
                    key={trigger.id}
                    className="bg-warning/10 border border-warning/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{trigger.name}</span>
                      <div className="flex gap-2">
                        {trigger.impact_percent_bt !== null && (
                          <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            BT +{trigger.impact_percent_bt}%
                          </span>
                        )}
                        {trigger.impact_percent_mt !== null && (
                          <span className="text-xs font-bold bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                            MT +{trigger.impact_percent_mt}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{trigger.condition}</p>
                    {trigger.description && (
                      <p className="text-xs text-muted-foreground">{trigger.description}</p>
                    )}
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
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">BT</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">MT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTriggers.map((trigger, index) => (
                      <tr
                        key={trigger.id}
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
                          <span className={cn("font-semibold", trigger.isActive ? "text-blue-400" : "text-muted-foreground")}>
                            {trigger.impact_percent_bt !== null ? `+${trigger.impact_percent_bt}%` : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn("font-semibold", trigger.isActive ? "text-orange-400" : "text-muted-foreground")}>
                            {trigger.impact_percent_mt !== null ? `+${trigger.impact_percent_mt}%` : '-'}
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
