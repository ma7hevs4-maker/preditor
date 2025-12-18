import { useState } from "react";
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
import { Cloud, CloudRain, Thermometer, Wind } from "lucide-react";
import { HourDetailDialog } from "./HourDetailDialog";

interface PlanningTableProps {
  data: SimulationRow[];
}

const getTurno = (hora: number): "A" | "B" | "C" => {
  if (hora >= 0 && hora <= 7) return "A";
  if (hora >= 8 && hora <= 15) return "B";
  return "C";
};

export const PlanningTable = ({ data }: PlanningTableProps) => {
  const [selectedRow, setSelectedRow] = useState<SimulationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentHour = new Date().getHours();

  // Color thresholds: BT: verde ≤70, laranja ≤150, vermelho >150
  // MT: verde ≤10, laranja ≤15, vermelho >15
  const getBtStatusColor = (value: number) => {
    if (value > 150) return "text-destructive";
    if (value > 70) return "text-warning";
    return "text-success";
  };

  const getMtStatusColor = (value: number) => {
    if (value > 15) return "text-destructive";
    if (value > 10) return "text-warning";
    return "text-success";
  };

  const handleRowClick = (row: SimulationRow) => {
    setSelectedRow(row);
    setDialogOpen(true);
  };

  return (
    <div className="glass-card p-4 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">Planejamento Detalhado</h3>

      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="table-header sticky left-0 bg-card z-10">
                Hora
              </TableHead>
              <TableHead className="table-header">Turno</TableHead>
              <TableHead className="table-header text-center">Temp</TableHead>
              <TableHead className="table-header text-center">Chuva</TableHead>
              <TableHead className="table-header text-center">Vento</TableHead>
              <TableHead className="table-header text-right">
                <span className="text-cyan-400">Entrada BT</span>
              </TableHead>
              <TableHead className="table-header text-right">
                <span className="text-purple-400">Entrada MT</span>
              </TableHead>
              <TableHead className="table-header text-right">Equipes</TableHead>
              <TableHead className="table-header text-right">
                <span className="text-cyan-400">Cap BT</span>
              </TableHead>
              <TableHead className="table-header text-right">
                <span className="text-purple-400">Cap MT</span>
              </TableHead>
              <TableHead className="table-header text-right">
                <span className="text-cyan-400">Saldo BT</span>
              </TableHead>
              <TableHead className="table-header text-right">
                <span className="text-purple-400">Saldo MT</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const isCurrentHour = row.hora === currentHour && row.dia === 0;
              const turno = getTurno(row.hora);

              return (
                <TableRow
                  key={`${row.dia}-${row.hora}`}
                  className={cn(
                    "border-border/20 transition-colors cursor-pointer hover:bg-primary/5",
                    isCurrentHour && "bg-primary/10 border-l-2 border-l-primary",
                    row.dia > 0 && "opacity-80"
                  )}
                  onClick={() => handleRowClick(row)}
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
                    <div className="flex items-center justify-center gap-1">
                      <Thermometer className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-orange-400">{row.temp_c.toFixed(0)}°</span>
                    </div>
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
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Wind className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-emerald-400">{row.wind_ms.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="data-cell text-right text-cyan-400">
                    {row.entrada_bt_adj.toFixed(1)}
                  </TableCell>
                  <TableCell className="data-cell text-right text-purple-400">
                    {row.entrada_mt_adj.toFixed(1)}
                  </TableCell>
                  <TableCell className="data-cell text-right">
                    {row.eq_disp}
                  </TableCell>
                  <TableCell className="data-cell text-right text-cyan-400">
                    {row.cap_bt_h.toFixed(1)}
                  </TableCell>
                  <TableCell className="data-cell text-right text-purple-400">
                    {row.cap_mt_h.toFixed(1)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "data-cell text-right font-semibold",
                      getBtStatusColor(row.incidentes_bt_saldo)
                    )}
                  >
                    {row.incidentes_bt_saldo}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "data-cell text-right font-semibold",
                      getMtStatusColor(row.incidentes_mt_saldo)
                    )}
                  >
                    {row.incidentes_mt_saldo}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <HourDetailDialog 
        row={selectedRow} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  );
};
