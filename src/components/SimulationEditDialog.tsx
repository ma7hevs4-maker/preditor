import { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimulationHistoryEntry } from "@/hooks/useSimulationHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SimulationEditDialogProps {
  entry: SimulationHistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, teamStructureSnapshot: Record<string, unknown>) => Promise<void>;
}

export const SimulationEditDialog = ({
  entry,
  open,
  onOpenChange,
  onSave,
}: SimulationEditDialogProps) => {
  const [teams, setTeams] = useState<number[]>(Array(24).fill(0));
  const [lossTeams, setLossTeams] = useState<number[]>(Array(24).fill(0));
  const [teamsDay2, setTeamsDay2] = useState<number[]>(Array(24).fill(0));
  const [lossTeamsDay2, setLossTeamsDay2] = useState<number[]>(Array(24).fill(0));
  const [teamsDay3, setTeamsDay3] = useState<number[]>(Array(24).fill(0));
  const [lossTeamsDay3, setLossTeamsDay3] = useState<number[]>(Array(24).fill(0));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (entry?.team_structure_snapshot) {
      const snapshot = entry.team_structure_snapshot as Record<string, number[]>;
      setTeams(snapshot.teamsPerHour || Array(24).fill(0));
      setLossTeams(snapshot.lossTeamsPerHour || Array(24).fill(0));
      setTeamsDay2(snapshot.teamsPerHourDay2 || Array(24).fill(0));
      setLossTeamsDay2(snapshot.lossTeamsPerHourDay2 || Array(24).fill(0));
      setTeamsDay3(snapshot.teamsPerHourDay3 || Array(24).fill(0));
      setLossTeamsDay3(snapshot.lossTeamsPerHourDay3 || Array(24).fill(0));
    }
  }, [entry]);

  if (!entry) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newSnapshot = {
        teamsPerHour: teams,
        lossTeamsPerHour: lossTeams,
        teamsPerHourDay2: teamsDay2,
        lossTeamsPerHourDay2: lossTeamsDay2,
        teamsPerHourDay3: teamsDay3,
        lossTeamsPerHourDay3: lossTeamsDay3,
      };
      await onSave(entry.id, newSnapshot);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTeam = (index: number, value: number, setter: React.Dispatch<React.SetStateAction<number[]>>) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = Math.max(0, Math.min(200, value));
      return updated;
    });
  };

  const renderShiftTable = (
    dayTeams: number[],
    dayLossTeams: number[],
    setDayTeams: React.Dispatch<React.SetStateAction<number[]>>,
    setDayLossTeams: React.Dispatch<React.SetStateAction<number[]>>,
    shiftName: string,
    startHour: number
  ) => {
    const endHour = startHour + 8;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Turno {shiftName} ({startHour}h - {endHour - 1}h)</h4>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 8 }, (_, i) => startHour + i).map((hour) => (
            <div key={hour} className="space-y-1">
              <Label className="text-[10px] text-center block">{String(hour).padStart(2, "0")}h</Label>
              <Input
                type="number"
                min="0"
                max="200"
                value={dayTeams[hour]}
                onChange={(e) => updateTeam(hour, parseInt(e.target.value) || 0, setDayTeams)}
                className="h-8 text-xs text-center px-1"
                title="Equipes"
              />
              <Input
                type="number"
                min="0"
                max="200"
                value={dayLossTeams[hour]}
                onChange={(e) => updateTeam(hour, parseInt(e.target.value) || 0, setDayLossTeams)}
                className="h-8 text-xs text-center px-1 bg-amber-500/10"
                title="Equipes Perdas"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayTab = (
    dayTeams: number[],
    dayLossTeams: number[],
    setDayTeams: React.Dispatch<React.SetStateAction<number[]>>,
    setDayLossTeams: React.Dispatch<React.SetStateAction<number[]>>
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/20"></div>
          <span>Equipes</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500/20"></div>
          <span>Equipes Perdas</span>
        </div>
      </div>
      {renderShiftTable(dayTeams, dayLossTeams, setDayTeams, setDayLossTeams, "A", 0)}
      {renderShiftTable(dayTeams, dayLossTeams, setDayTeams, setDayLossTeams, "B", 8)}
      {renderShiftTable(dayTeams, dayLossTeams, setDayTeams, setDayLossTeams, "C", 16)}
    </div>
  );

  const horizonDays = Math.ceil(entry.horizon_hours / 24);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Editar Equipes - {entry.name}
          </DialogTitle>
          <DialogDescription>
            Ajuste a alocação de equipes por hora para recalcular a simulação.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <Tabs defaultValue="day1" className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(horizonDays, 3)}, 1fr)` }}>
              <TabsTrigger value="day1">Dia 1</TabsTrigger>
              {horizonDays >= 2 && <TabsTrigger value="day2">Dia 2</TabsTrigger>}
              {horizonDays >= 3 && <TabsTrigger value="day3">Dia 3</TabsTrigger>}
            </TabsList>
            <TabsContent value="day1" className="mt-4">
              {renderDayTab(teams, lossTeams, setTeams, setLossTeams)}
            </TabsContent>
            {horizonDays >= 2 && (
              <TabsContent value="day2" className="mt-4">
                {renderDayTab(teamsDay2, lossTeamsDay2, setTeamsDay2, setLossTeamsDay2)}
              </TabsContent>
            )}
            {horizonDays >= 3 && (
              <TabsContent value="day3" className="mt-4">
                {renderDayTab(teamsDay3, lossTeamsDay3, setTeamsDay3, setLossTeamsDay3)}
              </TabsContent>
            )}
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
