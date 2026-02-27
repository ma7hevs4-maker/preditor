import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SimulationRow } from "@/hooks/useSimulation";
import { BarChart3, Zap, CloudRain, TrendingDown, Users, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getHalfLifeBucket } from "@/hooks/useHalfLife";

interface DailySummaryDialogProps {
  simulationData: SimulationRow[];
}

// Rain thresholds matching database triggers
const getFaixaChuvaLabel = (mm: number): string => {
  if (mm < 0.2) return "Seco";
  if (mm < 3.0) return "Fraca";
  if (mm < 6.0) return "Moderada";
  if (mm < 10.0) return "Forte";
  return "Muito Forte";
};

interface DaySummary {
  day: number;
  dayLabel: string;
  totalEntradaBt: number;
  totalEntradaMt: number;
  totalRetOpBt: number;
  totalRetOpMt: number;
  totalRetEqBt: number;
  totalRetEqMt: number;
  triggersActive: number;
  avgUpliftBt: number;
  avgUpliftMt: number;
  totalEntradaAdicionalBt: number;
  totalEntradaAdicionalMt: number;
  retPerHourBt: number;
  retPerHourMt: number;
  hoursInDay: number;
  finalBacklogBt: number;
  finalBacklogMt: number;
  rows: SimulationRow[]; // raw rows for hourly detail
}

export const DailySummaryDialog = ({ simulationData }: DailySummaryDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTriggers, setExpandedTriggers] = useState<Set<number>>(new Set());

  const toggleTriggerExpand = (day: number) => {
    setExpandedTriggers(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };
  // Group data by day and calculate summaries
  const dailySummaries: DaySummary[] = [];
  
  if (simulationData.length > 0) {
    // Group by dia
    const dayGroups = new Map<number, SimulationRow[]>();
    simulationData.forEach((row) => {
      const existing = dayGroups.get(row.dia) || [];
      existing.push(row);
      dayGroups.set(row.dia, existing);
    });

    dayGroups.forEach((rows, day) => {
      const dayLabel = day === 0 ? "Hoje" : day === 1 ? "Amanhã" : `Dia ${day + 1}`;
      
      const hoursWithTrigger = rows.filter((r) => r.uplift_bt_pct > 0 || r.uplift_mt_pct > 0);
      const totalRetEqBt = rows.reduce((sum, r) => sum + r.cap_bt_h, 0);
      const totalRetEqMt = rows.reduce((sum, r) => sum + r.cap_mt_h, 0);
      
      // Get the last row of the day to get final backlog
      const sortedRows = [...rows].sort((a, b) => a.hora - b.hora);
      const lastRow = sortedRows[sortedRows.length - 1];
      
      const summary: DaySummary = {
        day,
        dayLabel,
        totalEntradaBt: Math.round(rows.reduce((sum, r) => sum + r.entrada_bt_adj, 0)),
        totalEntradaMt: Math.round(rows.reduce((sum, r) => sum + r.entrada_mt_adj, 0)),
        totalRetOpBt: Math.round(rows.reduce((sum, r) => sum + r.ret_op_bt, 0)),
        totalRetOpMt: Math.round(rows.reduce((sum, r) => sum + r.ret_op_mt, 0)),
        totalRetEqBt: Math.round(totalRetEqBt),
        totalRetEqMt: Math.round(totalRetEqMt),
        triggersActive: hoursWithTrigger.length,
        avgUpliftBt: hoursWithTrigger.length > 0 
          ? hoursWithTrigger.reduce((sum, r) => sum + r.uplift_bt_pct, 0) / hoursWithTrigger.length 
          : 0,
        avgUpliftMt: hoursWithTrigger.length > 0 
          ? hoursWithTrigger.reduce((sum, r) => sum + r.uplift_mt_pct, 0) / hoursWithTrigger.length 
          : 0,
        totalEntradaAdicionalBt: Math.round(
          rows.reduce((sum, r) => sum + (r.entrada_bt_adj - r.entrada_bt_base), 0)
        ),
        totalEntradaAdicionalMt: Math.round(
          rows.reduce((sum, r) => sum + (r.entrada_mt_adj - r.entrada_mt_base), 0)
        ),
        retPerHourBt: rows.length > 0 ? totalRetEqBt / rows.length : 0,
        retPerHourMt: rows.length > 0 ? totalRetEqMt / rows.length : 0,
        hoursInDay: rows.length,
        finalBacklogBt: Math.round(lastRow?.incidentes_bt_saldo ?? 0),
        finalBacklogMt: Math.round(lastRow?.incidentes_mt_saldo ?? 0),
        rows: sortedRows,
      };
      
      dailySummaries.push(summary);
    });

    // Sort by day
    dailySummaries.sort((a, b) => a.day - b.day);
  }

  const hasData = simulationData.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 mt-3 bg-secondary/50 border-border hover:bg-secondary">
          <BarChart3 className="w-4 h-4" />
          Resumo Diário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-primary" />
            Resumo Diário da Simulação
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Totais de incidentes por dia até o final do horizonte
          </DialogDescription>
        </DialogHeader>

        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            Configure uma simulação para ver o resumo diário.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {dailySummaries.map((summary) => (
              <div
                key={summary.day}
                className="border border-border rounded-lg p-4 bg-secondary/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg text-foreground">
                    {summary.dayLabel}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {summary.hoursInDay} horas
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Entrada Total */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      Entrada Total
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-primary/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">BT</p>
                        <p className="font-mono font-semibold text-primary">
                          {summary.totalEntradaBt}
                        </p>
                      </div>
                      <div className="bg-purple-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">MT</p>
                        <p className="font-mono font-semibold text-purple-400">
                          {summary.totalEntradaMt}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Retirada por Operador */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <TrendingDown className="w-3 h-3" />
                      Ret. Operador
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">BT</p>
                        <p className="font-mono font-semibold text-green-400">
                          {summary.totalRetOpBt}
                        </p>
                      </div>
                      <div className="bg-green-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">MT</p>
                        <p className="font-mono font-semibold text-green-400">
                          {summary.totalRetOpMt}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Retirada por Equipe */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <Users className="w-3 h-3" />
                      Ret. Equipe
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">BT</p>
                        <p className="font-mono font-semibold text-blue-400">
                          {summary.totalRetEqBt}
                        </p>
                      </div>
                      <div className="bg-blue-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">MT</p>
                        <p className="font-mono font-semibold text-blue-400">
                          {summary.totalRetEqMt}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gatilhos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <CloudRain className="w-3 h-3" />
                      Gatilhos
                    </div>
                    <div className="bg-amber-500/10 rounded p-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Horas</p>
                        <p className={cn(
                          "font-mono font-semibold text-sm",
                          summary.triggersActive > 0 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {summary.triggersActive}h
                        </p>
                      </div>
                      {summary.triggersActive > 0 && (
                        <div className="mt-1 pt-1 border-t border-amber-500/20">
                          <p className="text-xs text-muted-foreground">Uplift médio</p>
                          <div className="flex gap-2 text-xs font-mono">
                            <span className="text-primary">BT: +{summary.avgUpliftBt.toFixed(0)}%</span>
                            <span className="text-purple-400">MT: +{summary.avgUpliftMt.toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entrada Adicional por Clima */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <CloudRain className="w-3 h-3" />
                      Entrada Extra (Clima)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-red-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">BT</p>
                        <p className={cn(
                          "font-mono font-semibold",
                          summary.totalEntradaAdicionalBt > 0 ? "text-red-400" : "text-muted-foreground"
                        )}>
                          +{summary.totalEntradaAdicionalBt}
                        </p>
                      </div>
                      <div className="bg-red-500/10 rounded p-2">
                        <p className="text-xs text-muted-foreground">MT</p>
                        <p className={cn(
                          "font-mono font-semibold",
                          summary.totalEntradaAdicionalMt > 0 ? "text-red-400" : "text-muted-foreground"
                        )}>
                          +{summary.totalEntradaAdicionalMt}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Retirada Média por Hora */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      Ret. Equipe/h
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-secondary rounded p-2">
                        <p className="text-xs text-muted-foreground">BT</p>
                        <p className="font-mono font-semibold text-foreground">
                          {summary.retPerHourBt.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-secondary rounded p-2">
                        <p className="text-xs text-muted-foreground">MT</p>
                        <p className="font-mono font-semibold text-foreground">
                          {summary.retPerHourMt.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary footer */}
                <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Balanço BT (entrada - saídas)</p>
                    <p className={cn(
                      "font-mono font-semibold",
                      (summary.totalEntradaBt - summary.totalRetOpBt - summary.totalRetEqBt) > 0 
                        ? "text-red-400" 
                        : "text-green-400"
                    )}>
                      {summary.totalEntradaBt - summary.totalRetOpBt - summary.totalRetEqBt > 0 ? "+" : ""}
                      {summary.totalEntradaBt - summary.totalRetOpBt - summary.totalRetEqBt}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balanço MT (entrada - saídas)</p>
                    <p className={cn(
                      "font-mono font-semibold",
                      (summary.totalEntradaMt - summary.totalRetOpMt - summary.totalRetEqMt) > 0 
                        ? "text-red-400" 
                        : "text-green-400"
                    )}>
                      {summary.totalEntradaMt - summary.totalRetOpMt - summary.totalRetEqMt > 0 ? "+" : ""}
                      {summary.totalEntradaMt - summary.totalRetOpMt - summary.totalRetEqMt}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Final BT</p>
                    <p className={cn(
                      "font-mono font-semibold",
                      summary.finalBacklogBt > 150 
                        ? "text-red-400" 
                        : summary.finalBacklogBt > 70 
                          ? "text-amber-400" 
                          : "text-green-400"
                    )}>
                      {summary.finalBacklogBt}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Final MT</p>
                    <p className={cn(
                      "font-mono font-semibold",
                      summary.finalBacklogMt > 15 
                        ? "text-red-400" 
                        : summary.finalBacklogMt > 10 
                          ? "text-amber-400" 
                          : "text-green-400"
                    )}>
                      {summary.finalBacklogMt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
