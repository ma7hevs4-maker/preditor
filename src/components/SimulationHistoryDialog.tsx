import { useState } from "react";
import { History, Trash2, Calendar, Clock, Cloud, CloudOff, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSimulationHistory, SimulationHistoryEntry, SaveSimulationParams, SimulationResult } from "@/hooks/useSimulationHistory";
import { WeatherHour } from "@/hooks/useWeather";
import { WeatherProvider } from "@/hooks/useWeatherProvider";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SimulationHistoryDialogProps {
  baseId?: string;
  currentSimulation?: {
    results: SimulationResult[];
    config: {
      btInitialBacklog: number;
      mtInitialBacklog: number;
      horizonHours: number;
    };
    weatherProvider: WeatherProvider;
    weatherImpactEnabled: boolean;
    weatherData?: WeatherHour[];
  };
  onLoadSimulation?: (entry: SimulationHistoryEntry) => void;
}

export const SimulationHistoryDialog = ({
  baseId,
  currentSimulation,
  onLoadSimulation,
}: SimulationHistoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const { history, isLoading, saveSimulation, deleteSimulation } = useSimulationHistory(baseId);

  const handleSave = async () => {
    if (!baseId || !currentSimulation?.results?.length) {
      toast.error("Nenhuma simulação para salvar");
      return;
    }

    const name = saveName.trim() || `Simulação ${format(new Date(), "dd/MM HH:mm")}`;

    const params: SaveSimulationParams = {
      baseId,
      name,
      btInitialBacklog: currentSimulation.config.btInitialBacklog,
      mtInitialBacklog: currentSimulation.config.mtInitialBacklog,
      horizonHours: currentSimulation.config.horizonHours,
      weatherProvider: currentSimulation.weatherProvider,
      weatherImpactEnabled: currentSimulation.weatherImpactEnabled,
      resultsSnapshot: currentSimulation.results,
      weatherSnapshot: currentSimulation.weatherData,
    };

    try {
      await saveSimulation.mutateAsync(params);
      toast.success("Simulação salva com sucesso!");
      setSaveName("");
      setShowSaveForm(false);
    } catch (error) {
      toast.error("Erro ao salvar simulação");
    }
  };

  const handleLoad = (entry: SimulationHistoryEntry) => {
    if (onLoadSimulation) {
      onLoadSimulation(entry);
      setOpen(false);
      toast.success(`Simulação "${entry.name}" carregada`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteSimulation.mutateAsync(id);
      toast.success(`Simulação "${name}" excluída`);
    } catch (error) {
      toast.error("Erro ao excluir simulação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-secondary/50 border-border hover:bg-secondary"
          title="Histórico de Simulações"
        >
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Simulações
          </DialogTitle>
          <DialogDescription>
            Salve e carregue simulações anteriores para comparar resultados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save Current Simulation */}
          {currentSimulation?.results?.length > 0 && (
            <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
              {showSaveForm ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da simulação (opcional)"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSave} disabled={saveSimulation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveForm(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowSaveForm(true)} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Simulação Atual
                </Button>
              )}
            </div>
          )}

          {/* History List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma simulação salva ainda.</p>
                <p className="text-sm">Salve sua primeira simulação para acompanhar os resultados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{entry.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(entry.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(entry.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            {entry.weather_impact_enabled ? (
                              <Cloud className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <CloudOff className="w-3.5 h-3.5" />
                            )}
                            {entry.weather_provider === "openweathermap" ? "OpenWeather" : "Open-Meteo"}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>BT: {entry.bt_initial_backlog}</span>
                          <span>MT: {entry.mt_initial_backlog}</span>
                          <span>Horizonte: {entry.horizon_hours}h</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoad(entry)}
                          title="Carregar simulação"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(entry.id, entry.name)}
                          disabled={deleteSimulation.isPending}
                          className="text-destructive hover:text-destructive"
                          title="Excluir simulação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
