import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Pencil, X } from "lucide-react";
import { useContingencyLevels, useUpdateContingencyLevel, ContingencyLevel } from "@/hooks/useContingencyLevels";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const POLO_ORDER = [
  "Campos",
  "Lagos",
  "Macaé",
  "Noroeste",
  "Magé",
  "Niterói",
  "São Gonçalo",
  "Serrana",
  "Sul",
  "Enel Rio",
];

const levelColors = {
  normal: "bg-green-600/20 text-green-400 border-green-500/30",
  nivel1: "bg-yellow-600/20 text-yellow-400 border-yellow-500/30",
  nivel2: "bg-orange-600/20 text-orange-400 border-orange-500/30",
  crise: "bg-red-600/20 text-red-400 border-red-500/30",
  extremo: "bg-black/40 text-white border-white/30",
};

export const ContingencyLevelsConfig = () => {
  const { data: levels, isLoading } = useContingencyLevels();
  const updateLevel = useUpdateContingencyLevel();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<ContingencyLevel>>({});
  
  // Sort levels by POLO_ORDER
  const sortedLevels = levels?.slice().sort((a, b) => {
    const indexA = POLO_ORDER.indexOf(a.polo);
    const indexB = POLO_ORDER.indexOf(b.polo);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  const handleStartEdit = (level: ContingencyLevel) => {
    setEditingId(level.id);
    setEditedData({
      normal_min: level.normal_min,
      normal_max: level.normal_max,
      nivel1_min: level.nivel1_min,
      nivel1_max: level.nivel1_max,
      nivel2_min: level.nivel2_min,
      nivel2_max: level.nivel2_max,
      crise_min: level.crise_min,
      crise_max: level.crise_max,
      extremo_min: level.extremo_min,
    });
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
  };
  
  const handleSave = async () => {
    if (!editingId) return;
    
    try {
      await updateLevel.mutateAsync({
        id: editingId,
        ...editedData,
      });
      toast.success("Níveis atualizados com sucesso!");
      setEditingId(null);
      setEditedData({});
    } catch (error) {
      toast.error("Erro ao atualizar níveis");
    }
  };
  
  const handleFieldChange = (field: keyof ContingencyLevel, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: parseInt(value) || 0,
    }));
  };
  
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando níveis de contingência...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">Faixa de Incidências Ativas - Níveis de Contingência</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Configure os limites de incidentes para cada nível de contingência por polo
          </p>
        </div>
      </div>
      
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground font-medium sticky left-0 bg-muted/50 z-10">Polo</th>
              <th colSpan={2} className={cn("text-center px-2 py-2 font-medium border-l border-border", levelColors.normal)}>
                Normal
              </th>
              <th colSpan={2} className={cn("text-center px-2 py-2 font-medium border-l border-border", levelColors.nivel1)}>
                Nível 1
              </th>
              <th colSpan={2} className={cn("text-center px-2 py-2 font-medium border-l border-border", levelColors.nivel2)}>
                Nível 2
              </th>
              <th colSpan={2} className={cn("text-center px-2 py-2 font-medium border-l border-border", levelColors.crise)}>
                Crise
              </th>
              <th className={cn("text-center px-2 py-2 font-medium border-l border-border", levelColors.extremo)}>
                Extremo
              </th>
              <th className="text-center px-2 py-2 text-muted-foreground font-medium border-l border-border">
                Ações
              </th>
            </tr>
            <tr className="text-xs">
              <th className="sticky left-0 bg-muted/50 z-10"></th>
              <th className="px-1 py-1 text-muted-foreground border-l border-border">Min</th>
              <th className="px-1 py-1 text-muted-foreground">Max</th>
              <th className="px-1 py-1 text-muted-foreground border-l border-border">Min</th>
              <th className="px-1 py-1 text-muted-foreground">Max</th>
              <th className="px-1 py-1 text-muted-foreground border-l border-border">Min</th>
              <th className="px-1 py-1 text-muted-foreground">Max</th>
              <th className="px-1 py-1 text-muted-foreground border-l border-border">Min</th>
              <th className="px-1 py-1 text-muted-foreground">Max</th>
              <th className="px-1 py-1 text-muted-foreground border-l border-border">Min</th>
              <th className="border-l border-border"></th>
            </tr>
          </thead>
          <tbody>
            {sortedLevels?.map((level, index) => {
              const isEditing = editingId === level.id;
              const isEnelRio = level.polo === "Enel Rio";
              
              return (
                <tr 
                  key={level.id} 
                  className={cn(
                    index % 2 === 0 ? "bg-background" : "bg-muted/20",
                    isEnelRio && "font-bold bg-primary/10"
                  )}
                >
                  <td className={cn(
                    "px-3 py-2 text-foreground font-medium sticky left-0 z-10",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20",
                    isEnelRio && "bg-primary/10"
                  )}>
                    {level.polo}
                  </td>
                  
                  {/* Normal */}
                  <td className="px-1 py-1 text-center border-l border-border">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.normal_min ?? level.normal_min}
                        onChange={(e) => handleFieldChange("normal_min", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-green-400">{level.normal_min}</span>
                    )}
                  </td>
                  <td className="px-1 py-1 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.normal_max ?? level.normal_max}
                        onChange={(e) => handleFieldChange("normal_max", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-green-400">{level.normal_max}</span>
                    )}
                  </td>
                  
                  {/* Nível 1 */}
                  <td className="px-1 py-1 text-center border-l border-border">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.nivel1_min ?? level.nivel1_min}
                        onChange={(e) => handleFieldChange("nivel1_min", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-yellow-400">{level.nivel1_min}</span>
                    )}
                  </td>
                  <td className="px-1 py-1 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.nivel1_max ?? level.nivel1_max}
                        onChange={(e) => handleFieldChange("nivel1_max", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-yellow-400">{level.nivel1_max}</span>
                    )}
                  </td>
                  
                  {/* Nível 2 */}
                  <td className="px-1 py-1 text-center border-l border-border">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.nivel2_min ?? level.nivel2_min}
                        onChange={(e) => handleFieldChange("nivel2_min", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-orange-400">{level.nivel2_min}</span>
                    )}
                  </td>
                  <td className="px-1 py-1 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.nivel2_max ?? level.nivel2_max}
                        onChange={(e) => handleFieldChange("nivel2_max", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-orange-400">{level.nivel2_max}</span>
                    )}
                  </td>
                  
                  {/* Crise */}
                  <td className="px-1 py-1 text-center border-l border-border">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.crise_min ?? level.crise_min}
                        onChange={(e) => handleFieldChange("crise_min", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-red-400">{level.crise_min}</span>
                    )}
                  </td>
                  <td className="px-1 py-1 text-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.crise_max ?? level.crise_max}
                        onChange={(e) => handleFieldChange("crise_max", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-red-400">{level.crise_max}</span>
                    )}
                  </td>
                  
                  {/* Extremo */}
                  <td className="px-1 py-1 text-center border-l border-border">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.extremo_min ?? level.extremo_min}
                        onChange={(e) => handleFieldChange("extremo_min", e.target.value)}
                        className="w-16 h-7 text-xs text-center px-1"
                      />
                    ) : (
                      <span className="text-white">{level.extremo_min}</span>
                    )}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-2 py-1 text-center border-l border-border">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-green-400 hover:text-green-300"
                          onClick={handleSave}
                          disabled={updateLevel.isPending}
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => handleStartEdit(level)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Mapeamento de bases para polos:</strong></p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 ml-4">
          <li>• Lagos: Araruama, Cabo Frio</li>
          <li>• Noroeste: Itaperuna, Pádua, Cantagalo</li>
          <li>• Niterói: Niterói, Maricá</li>
          <li>• Serrana: Petrópolis, Teresópolis</li>
          <li>• Sul: Angra dos Reis, Resende</li>
        </ul>
      </div>
    </div>
  );
};
