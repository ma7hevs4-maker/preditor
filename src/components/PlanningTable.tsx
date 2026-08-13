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
import { useSystemSettings } from "@/hooks/useSystemSettings";
import * as XLSX from "xlsx";

interface PlanningTableProps {
  data: SimulationRow[];
  baseName?: string;
}

const getTurno = (hora: number): "A" | "B" | "C" => {
  if (hora >= 0 && hora <= 7) return "A";
  if (hora >= 8 && hora <= 15) return "B";
  return "C";
};

export const PlanningTable = ({ data, baseName }: PlanningTableProps) => {
  const [selectedRow, setSelectedRow] = useState<SimulationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentHour = new Date().getHours();

  // Metas configuráveis (Configurações do sistema)
  const { data: systemSettings } = useSystemSettings();
  const getSetting = (key: string, fallback: number) => {
    const s = systemSettings?.find((x) => x.key === key);
    const v = s ? parseFloat(s.value) : NaN;
    return Number.isFinite(v) ? v : fallback;
  };
  const targetBt = getSetting("bt_target", 70);
  const targetMt = getSetting("mt_target", 10);

  // Verde ≤ meta, laranja até ~2x a meta (BT) / 1,5x (MT), vermelho acima
  const getBtStatusColor = (value: number) => {
    if (value > targetBt * 2) return "text-destructive";
    if (value > targetBt) return "text-warning";
    return "text-success";
  };

  const getMtStatusColor = (value: number) => {
    if (value > targetMt * 1.5) return "text-destructive";
    if (value > targetMt) return "text-warning";
    return "text-success";
  };

  const handleRowClick = (row: SimulationRow) => {
    setSelectedRow(row);
    setDialogOpen(true);
  };

  const handleExportXLSX = () => {
    if (data.length === 0) return;

    const wb = XLSX.utils.book_new();

    // ========================================
    // ABA 1: Planejamento por Hora (detalhado)
    // ========================================
    const hourlyData = data.map((row) => ({
      // Identificação
      "Dia": row.dia + 1,
      "Hora": `${String(row.hora).padStart(2, "0")}:00`,
      "Data/Hora": new Date(row.datetime).toLocaleString("pt-BR"),
      "Turno": getTurno(row.hora),
      // Clima
      "Temp (°C)": row.temp_c.toFixed(1),
      "Chuva (mm)": row.precip_mm.toFixed(1),
      "Vento (km/h)": row.wind_kmh.toFixed(0),
      "Rajada (km/h)": row.gust_kmh.toFixed(0),
      "Descrição Clima": row.weather_description || "",
      // Impacto Climático (gatilhos ativos no momento)
      "Impacto Climático BT (%)": row.uplift_bt_raw_pct.toFixed(1),
      "Impacto Climático MT (%)": row.uplift_mt_raw_pct.toFixed(1),
      // Decay (half-life)
      "Horas Após Gatilho": row.tslr ?? "",
      "Gatilho do Decay": row.decay_source_name ?? "",
      "Residual BT (%)": row.uplift_bt_residual_pct ? row.uplift_bt_residual_pct.toFixed(0) : "",
      "Residual MT (%)": row.uplift_mt_residual_pct ? row.uplift_mt_residual_pct.toFixed(0) : "",
      // Impacto Final (climático + decay)
      "Impacto Final BT (%)": row.uplift_bt_pct.toFixed(1),
      "Impacto Final MT (%)": row.uplift_mt_pct.toFixed(1),
      // Entradas
      "Entrada BT (base)": row.entrada_bt_base.toFixed(1),
      "Entrada BT (ajustada)": row.entrada_bt_adj.toFixed(1),
      "Entrada MT (base)": row.entrada_mt_base.toFixed(1),
      "Entrada MT (ajustada)": row.entrada_mt_adj.toFixed(1),
      // Retiradas
      "Ret. Operador BT": row.ret_op_bt.toFixed(1),
      "Ret. Operador MT": row.ret_op_mt.toFixed(1),
      "Ret. Remoto BT": (row.remoto_bt_retirado || 0).toFixed(1),
      // Equipes
      "Equipes Totais": row.eq_disp,
      "Equipes MT": row.eq_mt,
      "Equipes BT": row.eq_bt,
      "Equipes BT (Extra)": row.eq_perdas,
      // Produtividade
      "Prod. BT (/eq/8h)": row.bt_productivity.toFixed(2),
      "Prod. MT (/eq/8h)": row.mt_productivity.toFixed(2),
      // Capacidade
      "Cap. BT/h": row.cap_bt_h.toFixed(1),
      "Cap. MT/h": row.cap_mt_h.toFixed(1),
      // Saldos
      "Saldo BT": row.incidentes_bt_saldo,
      "Saldo MT": row.incidentes_mt_saldo,
      "Saldo Total": row.incidentes_bt_saldo + row.incidentes_mt_saldo,
      // Cenário Ideal
      "Eq. Adicional BT": row.eq_bt_add.toFixed(1),
      "Eq. Adicional MT": row.eq_mt_add.toFixed(1),
      "Saldo BT (ideal)": Math.round(row.saldo_bt_ideal),
      "Saldo MT (ideal)": Math.round(row.saldo_mt_ideal),
      "Eq. Ideal Total": row.eq_ideal_total,
    }));

    const wsHourly = XLSX.utils.json_to_sheet(hourlyData);
    wsHourly["!cols"] = [
      { wch: 5 },   // Dia
      { wch: 8 },   // Hora
      { wch: 18 },  // Data/Hora
      { wch: 6 },   // Turno
      { wch: 10 },  // Temp
      { wch: 12 },  // Chuva
      { wch: 12 },  // Vento
      { wch: 12 },  // Rajada
      { wch: 20 },  // Descrição
      { wch: 20 },  // Impacto Clim BT
      { wch: 20 },  // Impacto Clim MT
      { wch: 16 },  // Horas Após Chuva
      { wch: 18 },  // Episódio Anterior
      { wch: 14 },  // Fator Decay
      { wch: 18 },  // Impacto Final BT
      { wch: 18 },  // Impacto Final MT
      { wch: 16 },  // Entrada BT base
      { wch: 18 },  // Entrada BT ajust
      { wch: 16 },  // Entrada MT base
      { wch: 18 },  // Entrada MT ajust
      { wch: 14 },  // Ret Op BT
      { wch: 14 },  // Ret Op MT
      { wch: 14 },  // Ret Remoto BT
      { wch: 14 },  // Equipes Totais
      { wch: 12 },  // Equipes MT
      { wch: 12 },  // Equipes BT
      { wch: 16 },  // Equipes BT Extra
      { wch: 14 },  // Prod BT
      { wch: 14 },  // Prod MT
      { wch: 10 },  // Cap BT
      { wch: 10 },  // Cap MT
      { wch: 10 },  // Saldo BT
      { wch: 10 },  // Saldo MT
      { wch: 12 },  // Saldo Total
      { wch: 14 },  // Eq Add BT
      { wch: 14 },  // Eq Add MT
      { wch: 14 },  // Saldo BT ideal
      { wch: 14 },  // Saldo MT ideal
      { wch: 14 },  // Eq Ideal Total
    ];
    XLSX.utils.book_append_sheet(wb, wsHourly, "Planejamento por Hora");

    // ========================================
    // ABA 2: Resumo Diário
    // ========================================
    const dayGroups = new Map<number, typeof data>();
    data.forEach((row) => {
      const existing = dayGroups.get(row.dia) || [];
      existing.push(row);
      dayGroups.set(row.dia, existing);
    });

    const dailySummary: Record<string, string | number>[] = [];
    const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);

    sortedDays.forEach((day) => {
      const rows = dayGroups.get(day) || [];
      const dayLabel = day === 0 ? "Hoje" : day === 1 ? "Amanhã" : `Dia ${day + 1}`;
      
      // Horas com impacto (climático OU decay)
      const hoursWithImpact = rows.filter((r) => r.uplift_bt_pct > 0 || r.uplift_mt_pct > 0);
      // Horas com gatilho climático ativo
      const hoursWithTrigger = rows.filter((r) => r.uplift_bt_raw_pct > 0 || r.uplift_mt_raw_pct > 0);
      
      const totalRetEqBt = rows.reduce((sum, r) => sum + r.cap_bt_h, 0);
      const totalRetEqMt = rows.reduce((sum, r) => sum + r.cap_mt_h, 0);
      const totalEntradaBt = rows.reduce((sum, r) => sum + r.entrada_bt_adj, 0);
      const totalEntradaMt = rows.reduce((sum, r) => sum + r.entrada_mt_adj, 0);
      const totalRetOpBt = rows.reduce((sum, r) => sum + r.ret_op_bt, 0);
      const totalRetOpMt = rows.reduce((sum, r) => sum + r.ret_op_mt, 0);
      const totalEntradaBaseBt = rows.reduce((sum, r) => sum + r.entrada_bt_base, 0);
      const totalEntradaBaseMt = rows.reduce((sum, r) => sum + r.entrada_mt_base, 0);
      
      const avgUpliftBt = hoursWithImpact.length > 0 
        ? hoursWithImpact.reduce((sum, r) => sum + r.uplift_bt_pct, 0) / hoursWithImpact.length 
        : 0;
      const avgUpliftMt = hoursWithImpact.length > 0 
        ? hoursWithImpact.reduce((sum, r) => sum + r.uplift_mt_pct, 0) / hoursWithImpact.length 
        : 0;

      const balancoBt = totalEntradaBt - totalRetOpBt - totalRetEqBt;
      const balancoMt = totalEntradaMt - totalRetOpMt - totalRetEqMt;

      const lastRow = rows[rows.length - 1];

      dailySummary.push({
        "Dia": dayLabel,
        "Horas": rows.length,
        // Entradas
        "Entrada BT (base)": Math.round(totalEntradaBaseBt),
        "Entrada BT (ajustada)": Math.round(totalEntradaBt),
        "Entrada Extra BT": Math.round(totalEntradaBt - totalEntradaBaseBt),
        "Entrada MT (base)": Math.round(totalEntradaBaseMt),
        "Entrada MT (ajustada)": Math.round(totalEntradaMt),
        "Entrada Extra MT": Math.round(totalEntradaMt - totalEntradaBaseMt),
        // Retiradas
        "Ret. Operador BT": Math.round(totalRetOpBt),
        "Ret. Operador MT": Math.round(totalRetOpMt),
        "Ret. Equipe BT": Math.round(totalRetEqBt),
        "Ret. Equipe MT": Math.round(totalRetEqMt),
        // Balanço
        "Balanço BT": Math.round(balancoBt),
        "Balanço MT": Math.round(balancoMt),
        // Impacto Climático
        "Horas c/ Gatilho Ativo": hoursWithTrigger.length,
        "Horas c/ Impacto (incl. Decay)": hoursWithImpact.length,
        "Uplift Médio BT (%)": avgUpliftBt.toFixed(1),
        "Uplift Médio MT (%)": avgUpliftMt.toFixed(1),
        // Produtividade média
        "Ret. Equipe BT/h": (totalRetEqBt / rows.length).toFixed(1),
        "Ret. Equipe MT/h": (totalRetEqMt / rows.length).toFixed(1),
        // Saldo Final do Dia
        "Saldo BT (final)": lastRow?.incidentes_bt_saldo ?? "",
        "Saldo MT (final)": lastRow?.incidentes_mt_saldo ?? "",
      });
    });

    const wsDaily = XLSX.utils.json_to_sheet(dailySummary);
    wsDaily["!cols"] = [
      { wch: 10 },  // Dia
      { wch: 8 },   // Horas
      { wch: 16 },  // Entrada BT base
      { wch: 18 },  // Entrada BT ajust
      { wch: 14 },  // Entrada Extra BT
      { wch: 16 },  // Entrada MT base
      { wch: 18 },  // Entrada MT ajust
      { wch: 14 },  // Entrada Extra MT
      { wch: 14 },  // Ret Op BT
      { wch: 14 },  // Ret Op MT
      { wch: 14 },  // Ret Eq BT
      { wch: 14 },  // Ret Eq MT
      { wch: 12 },  // Balanço BT
      { wch: 12 },  // Balanço MT
      { wch: 18 },  // Horas Gatilho
      { wch: 22 },  // Horas Impacto
      { wch: 16 },  // Uplift BT
      { wch: 16 },  // Uplift MT
      { wch: 14 },  // Ret Eq BT/h
      { wch: 14 },  // Ret Eq MT/h
      { wch: 14 },  // Saldo BT final
      { wch: 14 },  // Saldo MT final
    ];
    XLSX.utils.book_append_sheet(wb, wsDaily, "Resumo Diário");

    // ========================================
    // Gerar arquivo
    // ========================================
    const now = new Date();
    const baseSlug = baseName 
      ? baseName.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : "base";
    const filename = `planejamento_${baseSlug}_${now.toISOString().slice(0, 10)}_${String(now.getHours()).padStart(2, "0")}h.xlsx`;
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
              <TableHead className="table-header text-center border-r border-border/50">Rajada</TableHead>
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
                  <TableCell className="text-center border-r border-border/50">
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
