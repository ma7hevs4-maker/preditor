import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useContingencyLevels, getContingencyLevel } from "@/hooks/useContingencyLevels";
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
    
    // Find levels directly by base name
    const baseLevels = allLevels.find(l => l.base_name === baseName);
    if (!baseLevels) return null;
    
    return {
      levels: baseLevels,
      contingency: getContingencyLevel(totalIncidents, baseLevels),
    };
  }, [baseName, allLevels, totalIncidents]);
  
  if (!result || !result.contingency) return null;
  
  const { levels, contingency } = result;
  
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
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help",
              contingency.color,
              className
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{contingency.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs z-[9999] bg-popover border border-border shadow-xl">
          <div className="space-y-2 text-xs">
            <p><strong>Base:</strong> {baseName}</p>
            <p><strong>Total de Incidentes (fim do horizonte):</strong> {totalIncidents}</p>
            <div className="border-t border-border pt-2 mt-2">
              <p className="font-semibold mb-1">Faixas da base:</p>
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
