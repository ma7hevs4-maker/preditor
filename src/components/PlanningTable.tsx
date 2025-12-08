import { HourlyData } from "@/data/mockPlanningData";
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

interface PlanningTableProps {
  data: HourlyData[];
  type: "BT" | "MT";
}

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
              <TableHead className="table-header text-right">Entrada</TableHead>
              <TableHead className="table-header text-right">Ret. Op.</TableHead>
              <TableHead className="table-header text-right">Eq. Disp.</TableHead>
              <TableHead className="table-header text-right">Cap/h</TableHead>
              <TableHead className="table-header text-right">Eq. Add.</TableHead>
              <TableHead className="table-header text-right">Saldo Disp.</TableHead>
              <TableHead className="table-header text-right">Saldo Ideal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const isCurrentHour = row.hora === currentHour;
              const saldoDisp =
                type === "BT"
                  ? row.incidentes_bt_saldo_disp
                  : row.incidentes_mt_saldo_disp;
              const saldoIdeal =
                type === "BT"
                  ? row.incidentes_bt_saldo_ideal
                  : row.incidentes_mt_saldo_ideal;
              const threshold = type === "BT" ? 15 : 5;

              return (
                <TableRow
                  key={row.hora}
                  className={cn(
                    "border-border/20 transition-colors",
                    isCurrentHour && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                >
                  <TableCell className="font-mono font-semibold sticky left-0 bg-card z-10">
                    {String(row.hora).padStart(2, "0")}:00
                    {isCurrentHour && (
                      <span className="ml-2 text-xs text-primary">(agora)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("turno-badge", `turno-${row.turno.toLowerCase()}`)}>
                      {row.turno}
                    </span>
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.entrada_bt_adj : row.entrada_mt_adj}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.ret_op_bt : row.ret_op_mt}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.eq_bt_disp : row.eq_mt_disp}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {type === "BT" ? row.cap_bt_h_disp : row.cap_mt_h_disp}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    <span
                      className={cn(
                        (type === "BT" ? row.eq_bt_add_dist : row.eq_mt_add_dist) > 0
                          ? "text-warning"
                          : "text-muted-foreground"
                      )}
                    >
                      +{type === "BT" ? row.eq_bt_add_dist : row.eq_mt_add_dist}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "data-cell text-right font-semibold",
                      getStatusColor(saldoDisp, threshold)
                    )}
                  >
                    {saldoDisp}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "data-cell text-right font-semibold",
                      getStatusColor(saldoIdeal, threshold)
                    )}
                  >
                    {saldoIdeal}
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
