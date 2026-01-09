import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useContingencyLevels, getPoloFromBase, getContingencyLevel } from "@/hooks/useContingencyLevels";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContingencyLevelIndicatorProps {
  baseName: string | undefined;
  totalIncidents: number;
  className?: string;
}

export const ContingencyLevelIndicator = ({ 
  baseName, 
  totalIncidents,
  className 
}: ContingencyLevelIndicatorProps) => {
  const { data: allLevels } = useContingencyLevels();
  
  const result = useMemo(() => {
    if (!baseName || !allLevels) return null;
    
    const polo = getPoloFromBase(baseName);
    if (!polo) return null;
    
    const poloLevels = allLevels.find(l => l.polo === polo);
    if (!poloLevels) return null;
    
    return {
      polo,
      levels: poloLevels,
      contingency: getContingencyLevel(totalIncidents, poloLevels),
    };
  }, [baseName, allLevels, totalIncidents]);
  
  if (!result || !result.contingency) return null;
  
  const { polo, levels, contingency } = result;
  
  // Calculate next level threshold
  const getNextLevelInfo = () => {
    if (contingency.level === "normal") {
      return { next: "Nível 1", threshold: levels.nivel1_min, gap: levels.nivel1_min - totalIncidents };
    }
    if (contingency.level === "nivel1") {
      return { next: "Nível 2", threshold: levels.nivel2_min, gap: levels.nivel2_min - totalIncidents };
    }
    if (contingency.level === "nivel2") {
      return { next: "Crise", threshold: levels.crise_min, gap: levels.crise_min - totalIncidents };
    }
    if (contingency.level === "crise") {
      return { next: "Extremo", threshold: levels.extremo_min, gap: levels.extremo_min - totalIncidents };
    }
    return null;
  };
  
  const nextLevel = getNextLevelInfo();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-help",
              contingency.color,
              className
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{contingency.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p><strong>Polo:</strong> {polo}</p>
            <p><strong>Total de Incidentes:</strong> {totalIncidents}</p>
            <div className="border-t border-border pt-2 mt-2">
              <p className="font-semibold mb-1">Faixas do polo:</p>
              <ul className="space-y-0.5">
                <li className={cn(contingency.level === "normal" && "font-bold text-green-400")}>
                  Normal: {levels.normal_min} - {levels.normal_max}
                </li>
                <li className={cn(contingency.level === "nivel1" && "font-bold text-yellow-400")}>
                  Nível 1: {levels.nivel1_min} - {levels.nivel1_max}
                </li>
                <li className={cn(contingency.level === "nivel2" && "font-bold text-orange-400")}>
                  Nível 2: {levels.nivel2_min} - {levels.nivel2_max}
                </li>
                <li className={cn(contingency.level === "crise" && "font-bold text-red-400")}>
                  Crise: {levels.crise_min} - {levels.crise_max}
                </li>
                <li className={cn(contingency.level === "extremo" && "font-bold")}>
                  Extremo: ≥ {levels.extremo_min}
                </li>
              </ul>
            </div>
            {nextLevel && nextLevel.gap > 0 && (
              <p className="border-t border-border pt-2 mt-2">
                <strong>{nextLevel.gap}</strong> incidentes até <strong>{nextLevel.next}</strong>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
