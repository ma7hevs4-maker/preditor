import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Regional } from "@/data/basesConfig";
import { RosterEntry, useDutyRosterForDate } from "@/hooks/useDutyRoster";

interface Props {
  regionais: Regional[];
  allBases: { id: string; name: string }[];
  selectedDate: Date;
}

const baseNamesFor = (r: Regional) =>
  (r.sucursais.length ? r.sucursais.map(s => s.name) : [r.label]).map(n => n.toLowerCase());

const statusLabel = (s: string) => (s === "sobreaviso" ? "Sobreaviso" : "Escala");

const RosterView = ({ regionais, allBases, selectedDate }: Props) => {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: entries = [] } = useDutyRosterForDate(dateStr);
  const [open, setOpen] = useState<string | null>(null);

  const byPolo = useMemo(() => {
    const nameById = Object.fromEntries(allBases.map(b => [b.id, b.name]));
    return regionais.map(r => {
      const names = baseNamesFor(r);
      const list = entries
        .filter(e => names.includes((nameById[e.base_id] ?? "").toLowerCase()))
        .map(e => ({ ...e, baseName: nameById[e.base_id] ?? "" }));
      return { regional: r, list };
    });
  }, [regionais, allBases, entries]);

  const current = byPolo.find(p => p.regional.label === open);

  const hours = (e: RosterEntry) =>
    e.start_time || e.end_time ? `${e.start_time ?? "--"} – ${e.end_time ?? "--"}` : "—";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {byPolo.map(({ regional, list }) => (
          <button
            key={regional.label}
            onClick={() => setOpen(regional.label)}
            className="glass-card p-4 text-left hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">{regional.label}</h3>
              <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{list.length}</Badge>
            </div>
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ninguém escalado</p>
            ) : (
              <ul className="space-y-1.5">
                {list.slice(0, 6).map(e => (
                  <li key={e.id} className="text-xs flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">{e.full_name}</span>
                    <span className="text-muted-foreground shrink-0">{e.role}</span>
                  </li>
                ))}
                {list.length > 6 && <li className="text-xs text-muted-foreground">+{list.length - 6} pessoa(s)</li>}
              </ul>
            )}
          </button>
        ))}
      </div>

      <Dialog open={!!current} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Escala — {current?.regional.label} · {format(selectedDate, "dd/MM/yyyy")}</DialogTitle>
          </DialogHeader>
          {current && current.list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada para este dia.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Nome</th>
                    {current && current.regional.sucursais.length > 0 && <th className="py-2 pr-3">Sucursal</th>}
                    <th className="py-2 pr-3">Cargo</th>
                    <th className="py-2 pr-3">Telefone</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {current?.list.map(e => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 text-foreground">{e.full_name}</td>
                      {current.regional.sucursais.length > 0 && <td className="py-2 pr-3">{e.baseName}</td>}
                      <td className="py-2 pr-3">{e.role}</td>
                      <td className="py-2 pr-3">
                        {e.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{e.phone}</span> : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={e.status === "sobreaviso" ? "outline" : "default"}>{statusLabel(e.status)}</Badge>
                      </td>
                      <td className="py-2">{hours(e)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RosterView;
