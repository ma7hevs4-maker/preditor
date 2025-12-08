import { cn } from "@/lib/utils";

interface TurnoIndicatorProps {
  turno: 'A' | 'B' | 'C';
  isActive?: boolean;
  equipesBT: number;
  equipesMT: number;
}

export const TurnoIndicator = ({
  turno,
  isActive = false,
  equipesBT,
  equipesMT,
}: TurnoIndicatorProps) => {
  const turnoConfig = {
    A: { label: "Turno A", hours: "00h - 07h", color: "turno-a" },
    B: { label: "Turno B", hours: "08h - 15h", color: "turno-b" },
    C: { label: "Turno C", hours: "16h - 23h", color: "turno-c" },
  };

  const config = turnoConfig[turno];

  return (
    <div
      className={cn(
        "glass-card p-4 transition-all duration-300",
        isActive && "ring-2 ring-primary/50 glow-primary"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn("turno-badge", config.color)}>
          {config.label}
        </span>
        {isActive && (
          <span className="status-indicator bg-primary" />
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{config.hours}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">BT</p>
          <p className="font-mono font-semibold">{equipesBT}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">MT</p>
          <p className="font-mono font-semibold">{equipesMT}</p>
        </div>
      </div>
    </div>
  );
};
