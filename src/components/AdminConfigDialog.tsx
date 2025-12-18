import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Lock, MapPin, Users, Database, AlertTriangle, Percent, Plus, Pencil, Trash2, Save } from "lucide-react";
import { useBases, useAddBase } from "@/hooks/useBases";
import { useHistoricalData, useUpdateHistoricalData } from "@/hooks/useHistoricalData";
import { useSystemSettings, useUpdateSystemSetting } from "@/hooks/useSystemSettings";
import { useAllWeatherTriggers, useAddWeatherTrigger, useUpdateWeatherTrigger, useDeleteWeatherTrigger } from "@/hooks/useWeatherTriggers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ADMIN_PASSWORD = "dys";

export const AdminConfigDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  
  const { data: bases, isLoading: basesLoading } = useBases();
  const { data: historicalData } = useHistoricalData(selectedBaseId);
  const { data: systemSettings, isLoading: settingsLoading } = useSystemSettings();
  const { data: weatherTriggers, isLoading: triggersLoading } = useAllWeatherTriggers();
  
  const addBase = useAddBase();
  const updateHistoricalData = useUpdateHistoricalData();
  const updateSystemSetting = useUpdateSystemSetting();
  const addWeatherTrigger = useAddWeatherTrigger();
  const updateWeatherTrigger = useUpdateWeatherTrigger();
  const deleteWeatherTrigger = useDeleteWeatherTrigger();

  // New base form
  const [newBaseName, setNewBaseName] = useState("");
  const [newBaseLat, setNewBaseLat] = useState("");
  const [newBaseLon, setNewBaseLon] = useState("");

  // Settings state
  const [operatorRemovalPercent, setOperatorRemovalPercent] = useState("40");
  const [btTarget, setBtTarget] = useState("70");
  const [mtTarget, setMtTarget] = useState("10");

  // New trigger form
  const [showNewTriggerForm, setShowNewTriggerForm] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    name: "",
    trigger_type: "precip",
    condition_min: "",
    condition_max: "",
    impact_percent: "",
    description: "",
    base_id: null as string | null,
  });

  // Load settings from database
  useEffect(() => {
    if (systemSettings) {
      const opRemoval = systemSettings.find(s => s.key === "operator_removal_percent");
      const btTgt = systemSettings.find(s => s.key === "bt_target");
      const mtTgt = systemSettings.find(s => s.key === "mt_target");
      
      if (opRemoval) setOperatorRemovalPercent(opRemoval.value);
      if (btTgt) setBtTarget(btTgt.value);
      if (mtTgt) setMtTarget(mtTgt.value);
    }
  }, [systemSettings]);

  const handlePasswordSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      setPassword("");
    } else {
      setPasswordError(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsAuthenticated(false);
    setPassword("");
    setPasswordError(false);
  };

  const handleAddBase = async () => {
    if (!newBaseName.trim() || !newBaseLat || !newBaseLon) {
      toast.error("Preencha todos os campos da base");
      return;
    }
    
    try {
      await addBase.mutateAsync({
        name: newBaseName.trim(),
        lat: parseFloat(newBaseLat),
        lon: parseFloat(newBaseLon),
        timezone: "America/Sao_Paulo",
      });
      toast.success("Base adicionada com sucesso!");
      setNewBaseName("");
      setNewBaseLat("");
      setNewBaseLon("");
    } catch (error) {
      toast.error("Erro ao adicionar base");
    }
  };

  const handleUpdateHistoricalField = async (id: string, field: string, value: number) => {
    try {
      await updateHistoricalData.mutateAsync({
        id,
        [field]: value,
      });
    } catch (error) {
      toast.error("Erro ao atualizar dado");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await Promise.all([
        updateSystemSetting.mutateAsync({ key: "operator_removal_percent", value: operatorRemovalPercent }),
        updateSystemSetting.mutateAsync({ key: "bt_target", value: btTarget }),
        updateSystemSetting.mutateAsync({ key: "mt_target", value: mtTarget }),
      ]);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleAddTrigger = async () => {
    if (!newTrigger.name || !newTrigger.impact_percent) {
      toast.error("Preencha nome e impacto do gatilho");
      return;
    }

    try {
      await addWeatherTrigger.mutateAsync({
        name: newTrigger.name,
        trigger_type: newTrigger.trigger_type,
        condition_min: newTrigger.condition_min ? parseFloat(newTrigger.condition_min) : null,
        condition_max: newTrigger.condition_max ? parseFloat(newTrigger.condition_max) : null,
        impact_percent: parseFloat(newTrigger.impact_percent),
        description: newTrigger.description || null,
        base_id: newTrigger.base_id,
        active: true,
      });
      toast.success("Gatilho adicionado com sucesso!");
      setNewTrigger({
        name: "",
        trigger_type: "precip",
        condition_min: "",
        condition_max: "",
        impact_percent: "",
        description: "",
        base_id: null,
      });
      setShowNewTriggerForm(false);
    } catch (error) {
      toast.error("Erro ao adicionar gatilho");
    }
  };

  const handleDeleteTrigger = async (id: string) => {
    try {
      await deleteWeatherTrigger.mutateAsync(id);
      toast.success("Gatilho removido!");
    } catch (error) {
      toast.error("Erro ao remover gatilho");
    }
  };

  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case "precip": return "Precipitação";
      case "wind": return "Vento";
      case "temp": return "Temperatura";
      default: return type;
    }
  };

  const formatCondition = (trigger: any) => {
    const type = trigger.trigger_type;
    const min = trigger.condition_min;
    const max = trigger.condition_max;
    
    let unit = "";
    switch (type) {
      case "precip": unit = "mm"; break;
      case "wind": unit = "m/s"; break;
      case "temp": unit = "°C"; break;
    }

    if (min !== null && max !== null) {
      return `${min} - ${max} ${unit}`;
    } else if (min !== null) {
      return `≥ ${min} ${unit}`;
    } else if (max !== null) {
      return `≤ ${max} ${unit}`;
    }
    return "-";
  };

  // Filter triggers by selected base
  const filteredTriggers = weatherTriggers?.filter(t => {
    if (!selectedBaseId) return t.base_id === null; // Show only defaults
    return t.base_id === null || t.base_id === selectedBaseId;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-secondary/50 border-border hover:bg-secondary">
          <Settings className="w-4 h-4" />
          Configuração
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        {!isAuthenticated ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Lock className="w-5 h-5 text-primary" />
                Acesso Restrito
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Digite a senha para acessar as configurações do sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  className={cn(
                    "bg-secondary border-border",
                    passwordError && "border-destructive"
                  )}
                  placeholder="Digite a senha"
                />
                {passwordError && (
                  <p className="text-xs text-destructive">Senha incorreta</p>
                )}
              </div>
              <Button onClick={handlePasswordSubmit} className="w-full">
                Entrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Settings className="w-5 h-5 text-primary" />
                Configurações do Sistema
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Gerencie bases, estruturas, dados históricos, gatilhos e configurações gerais
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="bases" className="mt-4">
              <TabsList className="grid w-full grid-cols-5 bg-secondary">
                <TabsTrigger value="bases" className="gap-1 text-xs">
                  <MapPin className="w-3 h-3" />
                  Bases
                </TabsTrigger>
                <TabsTrigger value="structures" className="gap-1 text-xs">
                  <Users className="w-3 h-3" />
                  Estruturas
                </TabsTrigger>
                <TabsTrigger value="historical" className="gap-1 text-xs">
                  <Database className="w-3 h-3" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="triggers" className="gap-1 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Gatilhos
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1 text-xs">
                  <Percent className="w-3 h-3" />
                  Geral
                </TabsTrigger>
              </TabsList>

              {/* BASES TAB */}
              <TabsContent value="bases" className="space-y-4 mt-4">
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-foreground">Adicionar Nova Base</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={newBaseName}
                        onChange={(e) => setNewBaseName(e.target.value)}
                        placeholder="Nome da base"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Latitude</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={newBaseLat}
                        onChange={(e) => setNewBaseLat(e.target.value)}
                        placeholder="-22.9068"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitude</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={newBaseLon}
                        onChange={(e) => setNewBaseLon(e.target.value)}
                        placeholder="-43.1729"
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddBase} disabled={addBase.isPending} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Adicionar Base
                  </Button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Nome</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Latitude</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Longitude</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {basesLoading ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                            Carregando...
                          </td>
                        </tr>
                      ) : bases?.map((base, index) => (
                        <tr key={base.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-3 py-2 text-foreground font-medium">{base.name}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">{base.lat}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">{base.lon}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* STRUCTURES TAB */}
              <TabsContent value="structures" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selecione a Base</Label>
                  <select
                    value={selectedBaseId || ""}
                    onChange={(e) => setSelectedBaseId(e.target.value || null)}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    <option value="">Selecione uma base</option>
                    {bases?.map((base) => (
                      <option key={base.id} value={base.id}>{base.name}</option>
                    ))}
                  </select>
                </div>

                {selectedBaseId && (
                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">Estrutura Padrão de Equipes (24h)</h4>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Plus className="w-3 h-3" />
                        Nova Estrutura
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Configure a quantidade de equipes padrão para cada hora do dia nesta base.
                      Esta estrutura pode ser carregada rapidamente na tela de simulação.
                    </p>
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                      Funcionalidade em desenvolvimento
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* HISTORICAL DATA TAB */}
              <TabsContent value="historical" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selecione a Base</Label>
                  <select
                    value={selectedBaseId || ""}
                    onChange={(e) => setSelectedBaseId(e.target.value || null)}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    <option value="">Selecione uma base</option>
                    {bases?.map((base) => (
                      <option key={base.id} value={base.id}>{base.name}</option>
                    ))}
                  </select>
                </div>

                {selectedBaseId && historicalData && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-2 py-2 text-muted-foreground font-medium">Hora</th>
                            <th className="px-2 py-2 text-muted-foreground font-medium">BT Prod.</th>
                            <th className="px-2 py-2 text-muted-foreground font-medium">BT Entrada</th>
                            <th className="px-2 py-2 text-muted-foreground font-medium">BT Ret.Op.</th>
                            <th className="px-2 py-2 text-muted-foreground font-medium">MT Prod.</th>
                            <th className="px-2 py-2 text-muted-foreground font-medium">MT Entrada</th>
                            <th className="px-2 py-2 text-muted-foreground font-medium">MT Ret.Op.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicalData.map((row, index) => (
                            <tr key={row.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                              <td className="px-2 py-1 text-center font-mono text-foreground">
                                {row.hour.toString().padStart(2, "0")}h
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={row.bt_productivity}
                                  onChange={(e) => handleUpdateHistoricalField(row.id, "bt_productivity", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-secondary border-border text-center"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={row.bt_entry_rate}
                                  onChange={(e) => handleUpdateHistoricalField(row.id, "bt_entry_rate", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-secondary border-border text-center"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.bt_operator_removal}
                                  onChange={(e) => handleUpdateHistoricalField(row.id, "bt_operator_removal", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-secondary border-border text-center"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={row.mt_productivity}
                                  onChange={(e) => handleUpdateHistoricalField(row.id, "mt_productivity", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-secondary border-border text-center"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={row.mt_entry_rate}
                                  onChange={(e) => handleUpdateHistoricalField(row.id, "mt_entry_rate", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-secondary border-border text-center"
                                />
                              </td>
                              <td className="px-1 py-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.mt_operator_removal}
                                  onChange={(e) => handleUpdateHistoricalField(row.id, "mt_operator_removal", parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs bg-secondary border-border text-center"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TRIGGERS TAB */}
              <TabsContent value="triggers" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Filtrar por Base (gatilhos podem variar por base)</Label>
                  <select
                    value={selectedBaseId || ""}
                    onChange={(e) => setSelectedBaseId(e.target.value || null)}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    <option value="">Padrão (todas as bases)</option>
                    {bases?.map((base) => (
                      <option key={base.id} value={base.id}>{base.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">Gatilhos Climáticos</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => setShowNewTriggerForm(!showNewTriggerForm)}
                  >
                    <Plus className="w-3 h-3" />
                    Novo Gatilho
                  </Button>
                </div>

                {showNewTriggerForm && (
                  <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 space-y-3">
                    <h5 className="font-medium text-foreground">Novo Gatilho</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={newTrigger.name}
                          onChange={(e) => setNewTrigger(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Chuva Forte"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={newTrigger.trigger_type}
                          onValueChange={(v) => setNewTrigger(prev => ({ ...prev, trigger_type: v }))}
                        >
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="precip">Precipitação (mm)</SelectItem>
                            <SelectItem value="wind">Vento (m/s)</SelectItem>
                            <SelectItem value="temp">Temperatura (°C)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Mínimo (deixe vazio para ≤)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={newTrigger.condition_min}
                          onChange={(e) => setNewTrigger(prev => ({ ...prev, condition_min: e.target.value }))}
                          placeholder="Ex: 5"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Máximo (deixe vazio para ≥)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={newTrigger.condition_max}
                          onChange={(e) => setNewTrigger(prev => ({ ...prev, condition_max: e.target.value }))}
                          placeholder="Ex: 10"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Impacto (%)</Label>
                        <Input
                          type="number"
                          value={newTrigger.impact_percent}
                          onChange={(e) => setNewTrigger(prev => ({ ...prev, impact_percent: e.target.value }))}
                          placeholder="Ex: 35"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Base Específica (opcional)</Label>
                        <Select
                          value={newTrigger.base_id || "default"}
                          onValueChange={(v) => setNewTrigger(prev => ({ ...prev, base_id: v === "default" ? null : v }))}
                        >
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Padrão (todas)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Padrão (todas as bases)</SelectItem>
                            {bases?.map((base) => (
                              <SelectItem key={base.id} value={base.id}>{base.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={newTrigger.description}
                        onChange={(e) => setNewTrigger(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ex: Aumento de 35% nas ocorrências"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddTrigger} disabled={addWeatherTrigger.isPending} className="gap-1">
                        <Save className="w-3 h-3" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewTriggerForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Nome</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tipo</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Condição</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Base</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Impacto</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {triggersLoading ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                            Carregando...
                          </td>
                        </tr>
                      ) : filteredTriggers?.map((trigger, index) => (
                        <tr key={trigger.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-3 py-2 text-foreground font-medium">{trigger.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{getTriggerTypeLabel(trigger.trigger_type)}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{formatCondition(trigger)}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">
                            {trigger.base_id ? bases?.find(b => b.id === trigger.base_id)?.name : "Padrão"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-semibold text-warning">+{trigger.impact_percent}%</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteTrigger(trigger.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* GENERAL SETTINGS TAB */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-foreground">Configurações Gerais</h4>
                  
                  {settingsLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="operator-removal">
                          Porcentagem de Retirada de Operador do Backlog Inicial
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="operator-removal"
                            type="number"
                            min={0}
                            max={100}
                            value={operatorRemovalPercent}
                            onChange={(e) => setOperatorRemovalPercent(e.target.value)}
                            className="w-24 bg-secondary border-border font-mono"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Porcentagem do backlog inicial que é removida na primeira hora da simulação 
                          (representa incidentes que vão direto para operadores fora do sistema de equipes).
                        </p>
                      </div>

                      <div className="border-t border-border pt-4 space-y-2">
                        <h5 className="font-medium text-foreground">Metas de Backlog Estável</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Meta BT (incidentes)</Label>
                            <Input
                              type="number"
                              value={btTarget}
                              onChange={(e) => setBtTarget(e.target.value)}
                              className="bg-secondary border-border font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Meta MT (incidentes)</Label>
                            <Input
                              type="number"
                              value={mtTarget}
                              onChange={(e) => setMtTarget(e.target.value)}
                              className="bg-secondary border-border font-mono"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Metas de backlog estável ao final do horizonte de simulação. 
                          Usado para calcular equipes adicionais necessárias.
                        </p>
                      </div>

                      <Button 
                        className="w-full gap-2" 
                        onClick={handleSaveSettings}
                        disabled={updateSystemSetting.isPending}
                      >
                        <Save className="w-4 h-4" />
                        Salvar Configurações
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
