import { cn } from "@/lib/utils";

interface TeamsDisplayProps {
  teamsPerHour: number[];
  currentHour: number;
}

const getTurno = (hour: number): "A" | "B" | "C" => {
  if (hour >= 0 && hour <= 7) return "A";
  if (hour >= 8 && hour <= 15) return "B";
  return "C";
};

export const TeamsDisplay = ({ teamsPerHour, currentHour }: TeamsDisplayProps) => {
  const currentTurno = getTurno(currentHour);

  const turnos = [
    { id: "A", name: "Turno A", hours: "00h - 07h", range: [0, 1, 2, 3, 4, 5, 6, 7], color: "blue" },
    { id: "B", name: "Turno B", hours: "08h - 15h", range: [8, 9, 10, 11, 12, 13, 14, 15], color: "amber" },
    { id: "C", name: "Turno C", hours: "16h - 23h", range: [16, 17, 18, 19, 20, 21, 22, 23], color: "purple" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {turnos.map((turno) => {
        const isActive = turno.id === currentTurno;
        const totalTeams = turno.range.reduce((sum, h) => sum + teamsPerHour[h], 0);
        const avgTeams = totalTeams / turno.range.length;

        return (
          <div
            key={turno.id}
            className={cn(
              "glass-card p-4 transition-all duration-300",
              isActive && "ring-2 ring-primary/50 glow-primary"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={cn("turno-badge", `turno-${turno.id.toLowerCase()}`)}>
                {turno.name}
              </span>
              {isActive && <span className="status-indicator bg-primary" />}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{turno.hours}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Média:</span>
              <span className="font-mono font-semibold text-primary">{avgTeams.toFixed(1)} eq/h</span>
            </div>
            {/* Mini bar visualization */}
            <div className="flex gap-0.5 mt-3 items-end h-8">
              {turno.range.map((h) => {
                const maxTeams = Math.max(...teamsPerHour, 1);
                const heightPct = (teamsPerHour[h] / maxTeams) * 100;
                return (
                  <div
                    key={h}
                    className={cn(
                      "flex-1 rounded-sm transition-all",
                      teamsPerHour[h] > 0 ? "bg-primary/60" : "bg-muted/30"
                    )}
                    style={{ height: `${Math.max(10, heightPct)}%` }}
                    title={`${h}h: ${teamsPerHour[h]} equipes`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
