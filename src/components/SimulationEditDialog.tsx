import { useState, useEffect } from "react";
import { Edit3, Users, Copy, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SimulationHistoryEntry } from "@/hooks/useSimulationHistory";
import { SimulationRow } from "@/hooks/useSimulation";
import { recalculateSimulation } from "@/utils/recalculateSimulation";

interface SimulationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: SimulationHistoryEntry | null;
  onSave: (entry: SimulationHistoryEntry, updatedResults: SimulationRow[]) => void;
}

const turnos = [
  { id: "A", name: "Turno A", hours: "00h - 07h", range: [0, 1, 2, 3, 4, 5, 6, 7], colorClass: "text-blue-400 border-blue-500/30" },
  { id: "B", name: "Turno B", hours: "08h - 15h", range: [8, 9, 10, 11, 12, 13, 14, 15], colorClass: "text-amber-400 border-amber-500/30" },
  { id: "C", name: "Turno C", hours: "16h - 23h", range: [16, 17, 18, 19, 20, 21, 22, 23], colorClass: "text-purple-400 border-purple-500/30" },
];

export const SimulationEditDialog = ({
  open,
  onOpenChange,
  entry,
  onSave,
}: SimulationEditDialogProps) => {
  const [editedResults, setEditedResults] = useState<SimulationRow[]>([]);
  const [btBacklog, setBtBacklog] = useState(0);
  const [mtBacklog, setMtBacklog] = useState(0);

  useEffect(() => {
    if (entry?.results_snapshot) {
      setEditedResults([...entry.results_snapshot]);
    }
    if (entry) {
      setBtBacklog(entry.bt_initial_backlog);
      setMtBacklog(entry.mt_initial_backlog);
    }
  }, [entry]);

  if (!entry) return null;

  // Group hours by day
  const getHoursByDay = (day: number) => {
    return editedResults.filter((row) => row.dia === day);
  };

  const uniqueDays = [...new Set(editedResults.map((r) => r.dia))].sort();

  const handleTeamChange = (dia: number, hora: number, value: number) => {
    setEditedResults((prev) =>
      prev.map((row) =>
        row.dia === dia && row.hora === hora
          ? { ...row, eq_disp: Math.max(0, Math.min(200, value)) }
          : row
      )
    );
  };

  const handleLossTeamChange = (dia: number, hora: number, value: number) => {
    setEditedResults((prev) =>
      prev.map((row) =>
        row.dia === dia && row.hora === hora
          ? { ...row, eq_perdas: Math.max(0, Math.min(200, value)) }
          : row
      )
    );
  };

  const copyFirstHourToShift = (dia: number, turnoRange: number[], isLoss: boolean) => {
    const firstHour = turnoRange[0];
    const firstRow = editedResults.find((r) => r.dia === dia && r.hora === firstHour);
    if (!firstRow) return;

    const value = isLoss ? firstRow.eq_perdas : firstRow.eq_disp;

    setEditedResults((prev) =>
      prev.map((row) => {
        if (row.dia === dia && turnoRange.includes(row.hora)) {
          return isLoss ? { ...row, eq_perdas: value } : { ...row, eq_disp: value };
        }
        return row;
      })
    );
  };

  const zeroShift = (dia: number, turnoRange: number[], isLoss: boolean) => {
    setEditedResults((prev) =>
      prev.map((row) => {
        if (row.dia === dia && turnoRange.includes(row.hora)) {
          return isLoss ? { ...row, eq_perdas: 0 } : { ...row, eq_disp: 0 };
        }
        return row;
      })
    );
  };

  const handleSave = () => {
    const updatedEntry = { ...entry, bt_initial_backlog: btBacklog, mt_initial_backlog: mtBacklog };
    const recalculated = recalculateSimulation(
      editedResults,
      btBacklog,
      mtBacklog
    );
    onSave(updatedEntry, recalculated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Edit3 className="w-5 h-5 text-primary" />
            Editar Simulação: {entry.name}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ajuste a alocação de equipes por hora
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {uniqueDays.map((dia) => {
              const dayHours = getHoursByDay(dia);
              if (dayHours.length === 0) return null;

              return (
                <div key={dia} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Dia {dia + 1} - Equipes por Hora
                    </h4>
                  </div>

                  {turnos.map((turno) => {
                    const turnoHours = dayHours.filter((h) => turno.range.includes(h.hora));
                    if (turnoHours.length === 0) return null;

                    return (
                      <div
                        key={`${dia}-${turno.id}`}
                        className={cn("space-y-2 p-3 rounded-lg border bg-secondary/20", turno.colorClass)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("turno-badge", `turno-${turno.id.toLowerCase()}`)}>
                              {turno.name}
                            </span>
                            <span className="text-xs text-muted-foreground">{turno.hours}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyFirstHourToShift(dia, turno.range, false)}
                              className="h-6 px-2 text-xs"
                              title="Copiar primeiro horário"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => zeroShift(dia, turno.range, false)}
                              className="h-6 px-2 text-xs"
                              title="Zerar turno"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Equipes */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Equipes</Label>
                          <div className="grid grid-cols-8 gap-1">
                            {turno.range.map((hour) => {
                              const row = dayHours.find((h) => h.hora === hour);
                              if (!row) return null;

                              return (
                                <div key={hour} className="text-center">
                                  <span className="text-xs text-muted-foreground block mb-0.5">
                                    {String(hour).padStart(2, "0")}h
                                  </span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={200}
                                    value={row.eq_disp}
                                    onChange={(e) =>
                                      handleTeamChange(dia, hour, parseInt(e.target.value) || 0)
                                    }
                                    className="h-8 text-center text-xs bg-secondary border-border font-mono p-1"
                                    onFocus={(e) => e.target.select()}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Equipes de BT */}
                        <div className="pt-2 border-t border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs text-amber-400">Eq. BT</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => copyFirstHourToShift(dia, turno.range, true)}
                                className="h-5 px-1.5 text-xs"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => zeroShift(dia, turno.range, true)}
                                className="h-5 px-1.5 text-xs"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {turno.range.map((hour) => {
                              const row = dayHours.find((h) => h.hora === hour);
                              if (!row) return null;

                              return (
                                <Input
                                  key={hour}
                                  type="number"
                                  min={0}
                                  max={200}
                                  value={row.eq_perdas}
                                  onChange={(e) =>
                                    handleLossTeamChange(dia, hour, parseInt(e.target.value) || 0)
                                  }
                                  className="h-7 text-center text-xs bg-amber-500/10 border-amber-500/30 font-mono p-1"
                                  onFocus={(e) => e.target.select()}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
