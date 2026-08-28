import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Unlock, Trash2, Loader2, KeyRound } from "lucide-react";
import { Base } from "@/hooks/useBases";
import { PlanKind } from "@/hooks/useDailyTeamPlans";
import {
  usePlanEditUnlocks,
  useAddPlanEditUnlock,
  useDeletePlanEditUnlock,
} from "@/hooks/usePlanEditUnlocks";
import { toast } from "sonner";

export const EditUnlocksTab = ({ bases }: { bases: Base[] }) => {
  const [baseId, setBaseId] = useState<string>("");
  const planKind: PlanKind = "planejado";
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [author, setAuthor] = useState("");
  const [note, setNote] = useState("");

  const { data: unlocks, isLoading } = usePlanEditUnlocks();
  const addUnlock = useAddPlanEditUnlock();
  const deleteUnlock = useDeletePlanEditUnlock();

  const baseName = (id: string) => bases.find(b => b.id === id)?.name ?? "—";

  const handleCreate = async () => {
    if (!baseId) {
      toast.error("Selecione o polo/sucursal");
      return;
    }
    if (endDate < startDate) {
      toast.error("Data final anterior à inicial");
      return;
    }
    try {
      await addUnlock.mutateAsync({
        base_id: baseId,
        plan_kind: planKind,
        start_date: startDate,
        end_date: endDate,
        created_by: author.trim() || null,
        note: note.trim() || null,
      });
      toast.success("Edição liberada", {
        description: `${baseName(baseId)} • ${format(new Date(`${startDate}T00:00:00`), "dd/MM", { locale: ptBR })} a ${format(new Date(`${endDate}T00:00:00`), "dd/MM", { locale: ptBR })}`,
      });
      setNote("");
    } catch {
      toast.error("Erro ao liberar edição");
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-foreground">Liberar Edição de Estrutura</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Libere um polo/sucursal e um período para que a estrutura já salva possa ser editada sem senha.
          Ao salvar novamente aquele dia, a edição volta a ficar bloqueada automaticamente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Polo / Sucursal</Label>
            <Select value={baseId} onValueChange={setBaseId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {bases.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tipo de Estrutura</Label>
            <Input value="Planejada" disabled className="bg-secondary border-border" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Liberado por (opcional)</Label>
            <Input
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Seu nome"
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Motivo (opcional)</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex.: ajuste de emergência"
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <Button onClick={handleCreate} disabled={addUnlock.isPending} size="sm">
          {addUnlock.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-1" />}
          Liberar Edição
        </Button>
      </div>

      <div className="border border-border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-foreground">Liberações Ativas</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !unlocks || unlocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma liberação ativa.</p>
        ) : (
          <div className="space-y-2">
            {unlocks.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{baseName(u.base_id)}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wide">
                      {u.plan_kind === "realizado" ? "Realizada" : "Planejada"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {format(new Date(`${u.start_date}T00:00:00`), "dd/MM/yyyy")} → {format(new Date(`${u.end_date}T00:00:00`), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.created_by ? `Por ${u.created_by}` : "Sem autor"}
                    {u.note ? ` • ${u.note}` : ""}
                    {u.consumed_dates?.length ? ` • ${u.consumed_dates.length} dia(s) já salvo(s)` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteUnlock.mutate(u.id)}
                  title="Revogar liberação"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
