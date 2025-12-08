import { useState } from "react";
import { PlanningConfig, BASES, defaultConfig } from "@/data/mockPlanningData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigurationFormProps {
  config: PlanningConfig;
  onConfigChange: (config: PlanningConfig) => void;
  onCalculate: () => void;
}

export const ConfigurationForm = ({
  config,
  onConfigChange,
  onCalculate,
}: ConfigurationFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<PlanningConfig>(config);

  const handleChange = (field: keyof PlanningConfig, value: number | string) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleEquipeChange = (
    type: "bt" | "mt",
    turno: "A" | "B" | "C",
    value: number
  ) => {
    const field = type === "bt" ? "equipes_bt" : "equipes_mt";
    setLocalConfig((prev) => ({
      ...prev,
      [field]: { ...prev[field], [turno]: Math.max(0, Math.min(50, value)) },
    }));
  };

  const handleApply = () => {
    onConfigChange(localConfig);
    onCalculate();
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalConfig(defaultConfig);
  };

  const selectedBase = BASES.find((b) => b.id === localConfig.base);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 bg-secondary/50 border-border hover:bg-secondary">
          <Settings className="w-4 h-4" />
          Configurar
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Configurações do Planejamento</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Ajuste os parâmetros para calcular o planejamento hora a hora
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Base Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Base / Região</Label>
            <Select
              value={localConfig.base}
              onValueChange={(value) => handleChange("base", value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione a base" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {BASES.map((base) => (
                  <SelectItem key={base.id} value={base.id}>
                    {base.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBase && (
              <p className="text-xs text-muted-foreground">
                Lat: {selectedBase.lat}, Lon: {selectedBase.lon}
              </p>
            )}
          </div>

          {/* Backlog Inicial */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Backlog Inicial
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Incidentes BT</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={localConfig.backlog_bt}
                  onChange={(e) =>
                    handleChange("backlog_bt", Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Incidentes MT</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={localConfig.backlog_mt}
                  onChange={(e) =>
                    handleChange("backlog_mt", Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>
          </div>

          {/* Equipes BT */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Equipes BT por Turno
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {(["A", "B", "C"] as const).map((turno) => (
                <div key={`bt-${turno}`} className="space-y-2">
                  <Label className={cn(
                    "text-xs",
                    turno === "A" && "text-blue-400",
                    turno === "B" && "text-amber-400",
                    turno === "C" && "text-purple-400"
                  )}>
                    Turno {turno}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={localConfig.equipes_bt[turno]}
                    onChange={(e) =>
                      handleEquipeChange("bt", turno, parseInt(e.target.value) || 0)
                    }
                    className="bg-secondary border-border font-mono text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Equipes MT */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Equipes MT por Turno
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {(["A", "B", "C"] as const).map((turno) => (
                <div key={`mt-${turno}`} className="space-y-2">
                  <Label className={cn(
                    "text-xs",
                    turno === "A" && "text-blue-400",
                    turno === "B" && "text-amber-400",
                    turno === "C" && "text-purple-400"
                  )}>
                    Turno {turno}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={localConfig.equipes_mt[turno]}
                    onChange={(e) =>
                      handleEquipeChange("mt", turno, parseInt(e.target.value) || 0)
                    }
                    className="bg-secondary border-border font-mono text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Produtividade */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Produtividade (por turno)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Prod. BT</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0.1}
                  max={10}
                  value={localConfig.prod_bt}
                  onChange={(e) =>
                    handleChange("prod_bt", Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 0.1)))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Prod. MT</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0.1}
                  max={10}
                  value={localConfig.prod_mt}
                  onChange={(e) =>
                    handleChange("prod_mt", Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 0.1)))
                  }
                  className="bg-secondary border-border font-mono"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1 gap-2 border-border hover:bg-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="w-4 h-4" />
              Calcular
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
