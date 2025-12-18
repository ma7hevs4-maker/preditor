import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Lock, MapPin, Users, Database, AlertTriangle, Percent, Plus, Pencil, Trash2 } from "lucide-react";
import { useBases, useAddBase } from "@/hooks/useBases";
import { useHistoricalData, useUpdateHistoricalData } from "@/hooks/useHistoricalData";
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
  const addBase = useAddBase();
  const updateHistoricalData = useUpdateHistoricalData();

  // New base form
  const [newBaseName, setNewBaseName] = useState("");
  const [newBaseLat, setNewBaseLat] = useState("");
  const [newBaseLon, setNewBaseLon] = useState("");

  // Operator removal percentage (currently hardcoded at 40%)
  const [operatorRemovalPercent, setOperatorRemovalPercent] = useState(40);

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

  // Weather triggers (hardcoded for now, could be moved to database)
  const defaultTriggers = [
    { name: "Chuva Fraca", condition: "precip >= 0.2 && precip < 1", impact: 15 },
    { name: "Chuva Moderada", condition: "precip >= 1 && precip < 5", impact: 35 },
    { name: "Chuva Forte", condition: "precip >= 5", impact: 60 },
    { name: "Vento Moderado", condition: "wind >= 4 && wind < 6", impact: 10 },
    { name: "Vento Forte", condition: "wind >= 6 && wind < 10", impact: 25 },
    { name: "Vento Muito Forte", condition: "wind >= 10", impact: 50 },
    { name: "Calor Extremo", condition: "temp >= 35", impact: 20 },
    { name: "Frio Intenso", condition: "temp <= 10", impact: 10 },
  ];

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
                  <Label>Selecione a Base (gatilhos podem variar por base)</Label>
                  <select
                    value={selectedBaseId || ""}
                    onChange={(e) => setSelectedBaseId(e.target.value || null)}
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-foreground"
                  >
                    <option value="">Todos (padrão)</option>
                    {bases?.map((base) => (
                      <option key={base.id} value={base.id}>{base.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">Gatilhos Climáticos</h4>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="w-3 h-3" />
                    Novo Gatilho
                  </Button>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Nome</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Condição</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Impacto</th>
                        <th className="text-right px-3 py-2 text-muted-foreground font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaultTriggers.map((trigger, index) => (
                        <tr key={trigger.name} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-3 py-2 text-foreground font-medium">{trigger.name}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{trigger.condition}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-semibold text-warning">+{trigger.impact}%</span>
                          </td>
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

              {/* GENERAL SETTINGS TAB */}
              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-foreground">Configurações Gerais</h4>
                  
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
                        onChange={(e) => setOperatorRemovalPercent(parseInt(e.target.value) || 0)}
                        className="w-24 bg-secondary border-border font-mono"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Porcentagem do backlog inicial que é removida na primeira hora da simulação 
                      (representa incidentes que vão direto para operadores fora do sistema de equipes).
                      Atualmente configurado em {operatorRemovalPercent}%.
                    </p>
                  </div>

                  <div className="border-t border-border pt-4 space-y-2">
                    <h5 className="font-medium text-foreground">Metas de Backlog Estável</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Meta BT (incidentes)</Label>
                        <Input
                          type="number"
                          defaultValue={70}
                          className="bg-secondary border-border font-mono"
                          disabled
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Meta MT (incidentes)</Label>
                        <Input
                          type="number"
                          defaultValue={10}
                          className="bg-secondary border-border font-mono"
                          disabled
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Metas de backlog estável ao final do horizonte de simulação. 
                      Usado para calcular equipes adicionais necessárias.
                    </p>
                  </div>

                  <Button className="w-full" onClick={() => toast.success("Configurações salvas!")}>
                    Salvar Configurações
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
