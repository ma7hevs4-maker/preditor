import { SimulationRow } from "@/hooks/useSimulation";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Cloud, CloudRain } from "lucide-react";

interface PlanningTableProps {
  data: SimulationRow[];
  type: "BT" | "MT";
}

const getTurno = (hora: number): "A" | "B" | "C" => {
  if (hora >= 0 && hora <= 7) return "A";
  if (hora >= 8 && hora <= 15) return "B";
  return "C";
};

export const PlanningTable = ({ data, type }: PlanningTableProps) => {
  const currentHour = new Date().getHours();

  const getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold * 2) return "text-destructive";
    if (value >= threshold) return "text-warning";
    return "text-success";
  };

  return (
    <div className="glass-card p-4 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span
          className={cn(
            "w-3 h-3 rounded-full",
            type === "BT" ? "bg-primary" : "bg-purple-500"
          )}
        />
        {type === "BT" ? "Baixa Tensão (BT)" : "Média Tensão (MT)"}
      </h3>

      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="table-header sticky left-0 bg-card z-10">
                Hora
              </TableHead>
              <TableHead className="table-header">Turno</TableHead>
              <TableHead className="table-header text-center">Clima</TableHead>
              <TableHead className="table-header text-right">Entrada</TableHead>
              <TableHead className="table-header text-right">Ret. Op.</TableHead>
              <TableHead className="table-header text-right">Equipes</TableHead>
              <TableHead className="table-header text-right">Cap/h</TableHead>
              <TableHead className="table-header text-right">Eq. Add.</TableHead>
              <TableHead className="table-header text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => {
              const isCurrentHour = row.hora === currentHour && row.dia === 0;
              const saldo = type === "BT" ? row.incidentes_bt_saldo : row.incidentes_mt_saldo;
              const threshold = type === "BT" ? 15 : 5;
              const turno = getTurno(row.hora);

              return (
                <TableRow
                  key={`${row.dia}-${row.hora}`}
                  className={cn(
                    "border-border/20 transition-colors",
                    isCurrentHour && "bg-primary/10 border-l-2 border-l-primary",
                    row.dia > 0 && "opacity-80"
                  )}
                >
                  <TableCell className="font-mono font-semibold sticky left-0 bg-card z-10">
                    {row.dia > 0 && (
                      <span className="text-xs text-muted-foreground mr-1">D{row.dia + 1}</span>
                    )}
                    {String(row.hora).padStart(2, "0")}:00
                    {isCurrentHour && (
                      <span className="ml-2 text-xs text-primary">(agora)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("turno-badge", `turno-${turno.toLowerCase()}`)}>
                      {turno}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.precip_mm > 0.2 ? (
                      <div className="flex items-center justify-center gap-1">
                        <CloudRain className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-400">{row.precip_mm.toFixed(1)}</span>
                      </div>
                    ) : (
                      <Cloud className="w-4 h-4 text-muted-foreground mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.entrada_bt_adj.toFixed(1) : row.entrada_mt_adj.toFixed(1)}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.ret_op_bt.toFixed(1) : row.ret_op_mt.toFixed(1)}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {row.eq_disp}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.cap_bt_h.toFixed(1) : row.cap_mt_h.toFixed(1)}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    <span
                      className={cn(
                        (type === "BT" ? row.eq_bt_add : row.eq_mt_add) > 0
                          ? "text-warning"
                          : "text-muted-foreground"
                      )}
                    >
                      +{type === "BT" ? row.eq_bt_add : row.eq_mt_add}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "data-cell text-right font-semibold",
                      getStatusColor(saldo, threshold)
                    )}
                  >
                    {saldo}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
