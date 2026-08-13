import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Base } from "@/hooks/useBases";
import { DecayCurve, DECAY_HOUR_KEYS, useDecayCurves, useUpdateDecayCurve } from "@/hooks/useDecayCurves";
import { Save, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  precip: "Chuva",
  gust: "Rajada",
  temp: "Temperatura",
};

const parseNumber = (raw: string): number => {
  const v = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

export const DecayCurvesTab = ({ bases }: { bases: Base[] }) => {
  const [baseId, setBaseId] = useState<string>(bases[0]?.id ?? "");
  const { data: curves, isLoading } = useDecayCurves(baseId || null);
  const updateCurve = useUpdateDecayCurve();
  const [edits, setEdits] = useState<Record<string, Record<string, number>>>({});

  const rows = useMemo(() => {
    return [...(curves ?? [])].sort((a, b) => {
      if (a.trigger_type !== b.trigger_type) return a.trigger_type.localeCompare(b.trigger_type);
      if (a.trigger_name !== b.trigger_name) return a.trigger_name.localeCompare(b.trigger_name);
      return a.level.localeCompare(b.level);
    });
  }, [curves]);

  const getValue = (row: DecayCurve, key: string) =>
    edits[row.id]?.[key] ?? Number(row[key as keyof DecayCurve] ?? 0);

  const setValue = (rowId: string, key: string, value: number) => {
    setEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: value } }));
  };

  /** Colar bloco do Excel a partir de (rowIndex, colIndex) */
  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
    const text = e.clipboardData.getData("text");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
    const next = { ...edits };
    lines.forEach((line, r) => {
      const target = rows[rowIndex + r];
      if (!target) return;
      line.split("\t").forEach((cell, c) => {
        const key = DECAY_HOUR_KEYS[colIndex + c];
        if (!key) return;
        next[target.id] = { ...next[target.id], [key]: parseNumber(cell) };
      });
    });
    setEdits(next);
  };

  const handleSave = async () => {
    const ids = Object.keys(edits);
    if (ids.length === 0) {
      toast.info("Nenhuma alteração para salvar");
      return;
    }
    try {
      for (const id of ids) {
        await updateCurve.mutateAsync({ id, ...edits[id] });
      }
      setEdits({});
      toast.success(`${ids.length} curva(s) atualizada(s)`);
    } catch (err) {
      toast.error("Erro ao salvar curvas de decay");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Base</Label>
          <Select value={baseId} onValueChange={(v) => { setBaseId(v); setEdits({}); }}>
            <SelectTrigger className="w-56 bg-secondary border-border">
              <SelectValue placeholder="Selecione a base" />
            </SelectTrigger>
            <SelectContent>
              {bases.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={Object.keys(edits).length === 0 || updateCurve.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar alterações
        </Button>
        {Object.keys(edits).length > 0 && (
          <Badge variant="outline" className="text-amber-400 border-amber-400/40">
            {Object.keys(edits).length} linha(s) editada(s)
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <TrendingDown className="w-3 h-3" />
        Cada linha é o impacto residual (%) nas horas seguintes ao fim do gatilho (+1h até +12h).
        É possível colar blocos direto do Excel.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando curvas...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma curva cadastrada para esta base.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-secondary">
              <tr>
                <th className="px-2 py-2 text-left sticky left-0 bg-secondary">Gatilho</th>
                <th className="px-2 py-2 text-center">Nível</th>
                {DECAY_HOUR_KEYS.map((k, i) => (
                  <th key={k} className="px-1 py-2 text-center whitespace-nowrap">+{i + 1}h</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.id} className={cn("border-t border-border/50", edits[row.id] && "bg-amber-400/5")}>
                  <td className="px-2 py-1 whitespace-nowrap sticky left-0 bg-card">
                    <span className="text-muted-foreground">{TYPE_LABEL[row.trigger_type] ?? row.trigger_type}</span>
                    {" · "}
                    <span className="text-foreground">{row.trigger_name}</span>
                  </td>
                  <td className="px-2 py-1 text-center font-medium">{row.level}</td>
                  {DECAY_HOUR_KEYS.map((key, colIndex) => (
                    <td key={key} className="px-1 py-1">
                      <Input
                        type="number"
                        value={getValue(row, key)}
                        onFocus={(e) => e.currentTarget.select()}
                        onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                        onChange={(e) => setValue(row.id, key, parseNumber(e.target.value))}
                        className="h-7 w-14 px-1 text-center bg-secondary border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
