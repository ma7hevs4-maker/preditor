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
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, Download, Thermometer, Wind } from "lucide-react";
import { HourDetailDialog } from "./HourDetailDialog";
import * as XLSX from "xlsx";

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

  const handleExportXLSX = () => {
    if (data.length === 0) return;

    // Prepare data for export with all detailed columns
    const exportData = data.map((row) => ({
      "Dia": row.dia + 1,
      "Hora": `${String(row.hora).padStart(2, "0")}:00`,
      "Data/Hora": new Date(row.datetime).toLocaleString("pt-BR"),
      "Turno": getTurno(row.hora),
      // Weather
      "Temperatura (°C)": row.temp_c,
      "Chuva (mm)": row.precip_mm,
      "Vento (km/h)": row.wind_kmh,
      "Rajada (km/h)": row.gust_kmh,
      "Clima": row.weather_description,
      "Uplift BT (%)": row.uplift_bt_pct,
      "Uplift MT (%)": row.uplift_mt_pct,
      // Entries
      "Entrada BT Base": row.entrada_bt_base,
      "Entrada BT Ajustada": row.entrada_bt_adj,
      "Entrada MT Base": row.entrada_mt_base,
      "Entrada MT Ajustada": row.entrada_mt_adj,
      // Operator removal
      "Ret. Operador BT": row.ret_op_bt,
      "Ret. Operador MT": row.ret_op_mt,
      // Remoto (first 8 hours only)
      "Ret. Remoto BT": row.remoto_bt_retirado || 0,
      // Teams
      "Equipes Disponíveis": row.eq_disp,
      "Equipes BT": row.eq_bt,
      "Equipes MT": row.eq_mt,
      "Equipes Perdas": row.eq_perdas,
      // Productivity
      "Produtividade BT": row.bt_productivity,
      "Produtividade MT": row.mt_productivity,
      // Capacity
      "Capacidade BT/h": row.cap_bt_h,
      "Capacidade MT/h": row.cap_mt_h,
      // Balance
      "Saldo BT": row.incidentes_bt_saldo,
      "Saldo MT": row.incidentes_mt_saldo,
      "Saldo Total": row.incidentes_bt_saldo + row.incidentes_mt_saldo,
      // Additional teams needed
      "Eq. Adicional BT": row.eq_bt_add,
      "Eq. Adicional MT": row.eq_mt_add,
      // Ideal scenario
      "Saldo BT Ideal": row.saldo_bt_ideal,
      "Saldo MT Ideal": row.saldo_mt_ideal,
      "Eq. Ideal Total": row.eq_ideal_total,
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // Dia
      { wch: 8 },  // Hora
      { wch: 18 }, // Data/Hora
      { wch: 6 },  // Turno
      { wch: 14 }, // Temperatura
      { wch: 10 }, // Chuva
      { wch: 12 }, // Vento
      { wch: 15 }, // Clima
      { wch: 12 }, // Uplift BT
      { wch: 12 }, // Uplift MT
      { wch: 15 }, // Entrada BT Base
      { wch: 18 }, // Entrada BT Ajustada
      { wch: 15 }, // Entrada MT Base
      { wch: 18 }, // Entrada MT Ajustada
      { wch: 15 }, // Ret. Operador BT
      { wch: 15 }, // Ret. Operador MT
      { wch: 15 }, // Ret. Remoto BT
      { wch: 18 }, // Equipes Disponíveis
      { wch: 12 }, // Equipes BT
      { wch: 12 }, // Equipes MT
      { wch: 14 }, // Equipes Perdas
      { wch: 15 }, // Produtividade BT
      { wch: 15 }, // Produtividade MT
      { wch: 15 }, // Capacidade BT/h
      { wch: 15 }, // Capacidade MT/h
      { wch: 10 }, // Saldo BT
      { wch: 10 }, // Saldo MT
      { wch: 12 }, // Saldo Total
      { wch: 14 }, // Eq. Adicional BT
      { wch: 14 }, // Eq. Adicional MT
      { wch: 14 }, // Saldo BT Ideal
      { wch: 14 }, // Saldo MT Ideal
      { wch: 14 }, // Eq. Ideal Total
    ];
    ws["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Planejamento Detalhado");

    // Generate filename with current date
    const now = new Date();
    const filename = `planejamento_${now.toISOString().slice(0, 10)}_${String(now.getHours()).padStart(2, "0")}h.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Planejamento Detalhado</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportXLSX}
          disabled={data.length === 0}
          className="gap-2 bg-background/50 border-border/50 hover:bg-background/80"
        >
          <Download className="w-4 h-4" />
          Exportar XLSX
        </Button>
      </div>

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
              <TableHead className="table-header text-center">Rajada</TableHead>
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
                      <Wind className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-cyan-400">{row.wind_kmh.toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Wind className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-purple-400">{row.gust_kmh.toFixed(0)}</span>
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
