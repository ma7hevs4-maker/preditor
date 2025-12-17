import { cn } from "@/lib/utils";

interface TeamsDisplayProps {
  teamsPerHour: number[];
  currentHour: number;
}

export const TeamsDisplay = ({ teamsPerHour, currentHour }: TeamsDisplayProps) => {
  const periods = [
    { name: "Madrugada", hours: [0, 1, 2, 3, 4, 5], color: "blue" },
    { name: "Manhã", hours: [6, 7, 8, 9, 10, 11], color: "amber" },
    { name: "Tarde", hours: [12, 13, 14, 15, 16, 17], color: "orange" },
    { name: "Noite", hours: [18, 19, 20, 21, 22, 23], color: "purple" },
  ];

  // Get current period
  const currentPeriodIndex = Math.floor(currentHour / 6);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {periods.map((period, index) => {
        const isActive = index === currentPeriodIndex;
        const totalTeams = period.hours.reduce((sum, h) => sum + teamsPerHour[h], 0);
        const colorClass = {
          blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
          amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
          orange: "text-orange-400 bg-orange-500/10 border-orange-500/30",
          purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
        }[period.color];

        return (
          <div
            key={period.name}
            className={cn(
              "glass-card p-3 transition-all border",
              colorClass,
              isActive && "ring-2 ring-primary/50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">{period.name}</span>
              {isActive && <span className="status-indicator bg-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {period.hours[0]}h - {period.hours[5]}h
            </p>
            <p className="font-mono text-lg font-semibold mt-1">{totalTeams} eq</p>
            <div className="flex gap-1 mt-2">
              {period.hours.map((h) => (
                <div
                  key={h}
                  className={cn(
                    "flex-1 h-1 rounded-full",
                    teamsPerHour[h] > 0 ? "bg-current opacity-60" : "bg-muted/30"
                  )}
                  title={`${h}h: ${teamsPerHour[h]} equipes`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
