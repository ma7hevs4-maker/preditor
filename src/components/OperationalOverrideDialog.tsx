import { useState, useMemo } from "react";
import { SlidersHorizontal, Clock, Calendar, RotateCcw, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export interface OperationalHourOverride {
  bt_productivity_pct: number;
  mt_productivity_pct: number;
  bt_entry_rate_pct: number;
  mt_entry_rate_pct: number;
  bt_operator_removal_pct: number;
  mt_operator_removal_pct: number;
}

export interface OperationalOverride {
  enabled: boolean;
  // key format: `${day}_${hour}` e.g. "1_8" = Day 1, Hour 8
  overrides: Record<string, OperationalHourOverride>;
}

const SHIFTS = [
  { name: "Turno A", label: "A (00-07h)", hours: [0, 1, 2, 3, 4, 5, 6, 7] },
  { name: "Turno B", label: "B (08-15h)", hours: [8, 9, 10, 11, 12, 13, 14, 15] },
  { name: "Turno C", label: "C (16-23h)", hours: [16, 17, 18, 19, 20, 21, 22, 23] },
];

const EMPTY_OVERRIDE: OperationalHourOverride = {
  bt_productivity_pct: 0,
  mt_productivity_pct: 0,
  bt_entry_rate_pct: 0,
  mt_entry_rate_pct: 0,
  bt_operator_removal_pct: 0,
  mt_operator_removal_pct: 0,
};

const PARAM_LABELS: { key: keyof OperationalHourOverride; label: string; color: string }[] = [
  { key: "bt_productivity_pct", label: "Produtividade BT", color: "text-blue-400" },
  { key: "mt_productivity_pct", label: "Produtividade MT", color: "text-purple-400" },
  { key: "bt_entry_rate_pct", label: "Entrada BT", color: "text-orange-400" },
  { key: "mt_entry_rate_pct", label: "Entrada MT", color: "text-red-400" },
  { key: "bt_operator_removal_pct", label: "Retirada Op. BT", color: "text-green-400" },
  { key: "mt_operator_removal_pct", label: "Retirada Op. MT", color: "text-emerald-400" },
];

interface OperationalOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  override: OperationalOverride;
  onOverrideChange: (override: OperationalOverride) => void;
  horizonHours: number;
}

export const OperationalOverrideDialog = ({
  open,
  onOpenChange,
  override,
  onOverrideChange,
  horizonHours,
}: OperationalOverrideDialogProps) => {
  const [localOverride, setLocalOverride] = useState<OperationalOverride>(override);
  const [mode, setMode] = useState<"shift" | "hour">("shift");
  const [selectedDay, setSelectedDay] = useState("1");
  const [selectedShift, setSelectedShift] = useState("0"); // index into SHIFTS
  const [selectedHour, setSelectedHour] = useState("8");
  const [currentValues, setCurrentValues] = useState<OperationalHourOverride>({ ...EMPTY_OVERRIDE });

  const numDays = Math.ceil(horizonHours / 24);

  const dayOptions = useMemo(() =>
    Array.from({ length: numDays }, (_, i) => ({
      value: (i + 1).toString(),
      label: `Dia ${i + 1}`,
    })), [numDays]);

  const hourOptions = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      value: i.toString(),
      label: `${i.toString().padStart(2, "0")}:00`,
    })), []);

  const handleAddOverride = () => {
    const newOverrides = { ...localOverride.overrides };

    if (mode === "shift") {
      const shift = SHIFTS[parseInt(selectedShift)];
      for (const hour of shift.hours) {
        const key = `${selectedDay}_${hour}`;
        newOverrides[key] = { ...currentValues };
      }
    } else {
      const key = `${selectedDay}_${selectedHour}`;
      newOverrides[key] = { ...currentValues };
    }

    setLocalOverride(prev => ({ ...prev, overrides: newOverrides }));
  };

  const handleRemoveOverride = (key: string) => {
    const newOverrides = { ...localOverride.overrides };
    delete newOverrides[key];
    setLocalOverride(prev => ({ ...prev, overrides: newOverrides }));
  };

  const handleRemoveGroup = (day: string, shiftIdx: number) => {
    const newOverrides = { ...localOverride.overrides };
    const shift = SHIFTS[shiftIdx];
    for (const hour of shift.hours) {
      delete newOverrides[`${day}_${hour}`];
    }
    setLocalOverride(prev => ({ ...prev, overrides: newOverrides }));
  };

  const handleApply = () => {
    onOverrideChange(localOverride);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetOverride: OperationalOverride = { enabled: false, overrides: {} };
    setLocalOverride(resetOverride);
    onOverrideChange(resetOverride);
    setCurrentValues({ ...EMPTY_OVERRIDE });
  };

  // Group existing overrides by day+shift for display
  const groupedOverrides = useMemo(() => {
    const groups: Record<string, { keys: string[]; values: OperationalHourOverride; day: string; shift?: string; hours: number[] }> = {};
    
    for (const [key, val] of Object.entries(localOverride.overrides)) {
      const [day, hourStr] = key.split("_");
      const hour = parseInt(hourStr);
      
      // Find which shift this hour belongs to
      const shiftIdx = SHIFTS.findIndex(s => s.hours.includes(hour));
      const groupKey = `${day}_shift${shiftIdx}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          keys: [],
          values: val,
          day,
          shift: SHIFTS[shiftIdx]?.label,
          hours: [],
        };
      }
      groups[groupKey].keys.push(key);
      groups[groupKey].hours.push(hour);
    }
    
    return groups;
  }, [localOverride.overrides]);

  const activeCount = Object.keys(localOverride.overrides).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Simular Operacional
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ajuste percentuais sobre os dados históricos para testar cenários operacionais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Ativar simulação operacional</Label>
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-xs">{activeCount}h configuradas</Badge>
              )}
            </div>
            <Switch
              checked={localOverride.enabled}
              onCheckedChange={(checked) =>
                setLocalOverride(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {/* Mode Selection */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "shift" | "hour")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shift" className="text-xs">Por Turno</TabsTrigger>
              <TabsTrigger value="hour" className="text-xs">Por Hora</TabsTrigger>
            </TabsList>

            {/* Period Selectors */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Dia</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="shift" className="mt-0 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Turno</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s, i) => (
                      <SelectItem key={i} value={i.toString()}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>

              <TabsContent value="hour" className="mt-0 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hora</Label>
                <Select value={selectedHour} onValueChange={setSelectedHour}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </div>
          </Tabs>

          {/* Parameter Inputs */}
          <div className="space-y-3 p-4 rounded-lg bg-secondary/20 border border-border">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Ajustes Percentuais (% sobre o valor histórico)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {PARAM_LABELS.map(({ key, label, color }) => (
                <div key={key} className="space-y-1">
                  <Label className={`text-xs ${color}`}>{label}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step={5}
                      value={currentValues[key]}
                      onChange={(e) =>
                        setCurrentValues(prev => ({
                          ...prev,
                          [key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-secondary border-border font-mono text-sm"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleAddOverride}
              size="sm"
              className="w-full mt-2"
              variant="secondary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar{" "}
              {mode === "shift"
                ? `Dia ${selectedDay} - ${SHIFTS[parseInt(selectedShift)].label}`
                : `Dia ${selectedDay} - ${selectedHour.padStart(2, "0")}:00`}
            </Button>
          </div>

          {/* Active Overrides Summary */}
          {activeCount > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Overrides Ativos
              </Label>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {Object.entries(groupedOverrides).map(([groupKey, group]) => {
                    const nonZero = PARAM_LABELS.filter(p => group.values[p.key] !== 0);
                    const shiftIdx = SHIFTS.findIndex(s => s.label === group.shift);
                    return (
                      <div
                        key={groupKey}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border text-xs"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            Dia {group.day} - {group.shift || `${group.hours.map(h => h.toString().padStart(2, "0")).join(", ")}h`}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {nonZero.map(p => (
                              <Badge key={p.key} variant="outline" className="text-[10px]">
                                <span className={p.color}>{p.label.replace("Retirada Op. ", "Ret.")}: </span>
                                <span className={group.values[p.key] > 0 ? "text-green-400" : "text-red-400"}>
                                  {group.values[p.key] > 0 ? "+" : ""}{group.values[p.key]}%
                                </span>
                              </Badge>
                            ))}
                            {nonZero.length === 0 && (
                              <span className="text-muted-foreground">Sem alterações</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() =>
                            shiftIdx >= 0
                              ? handleRemoveGroup(group.day, shiftIdx)
                              : group.keys.forEach(handleRemoveOverride)
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>Aplicar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
