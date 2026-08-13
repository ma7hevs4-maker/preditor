import { SimulationRow } from "@/hooks/useSimulation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloudRain, Thermometer, Wind, Users, TrendingDown, TrendingUp, Target, Zap, Timer } from "lucide-react";
import { cn } from "@/lib/utils";


interface HourDetailDialogProps {
  row: SimulationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTurno = (hora: number): "A" | "B" | "C" => {
  if (hora >= 0 && hora <= 7) return "A";
  if (hora >= 8 && hora <= 15) return "B";
  return "C";
};

// Rain thresholds matching database triggers: Fraca 0.2-3mm, Moderada 3-6mm, Forte 6-10mm, Muito Forte >10mm
const getFaixaChuvaLabel = (mm: number): string => {
  if (mm < 0.2) return "Seco";
  if (mm < 3.0) return "Fraca (0.2-3mm)";
  if (mm < 6.0) return "Moderada (3-6mm)";
  if (mm < 10.0) return "Forte (6-10mm)";
  return "Muito Forte (>10mm)";
};

export const HourDetailDialog = ({ row, open, onOpenChange }: HourDetailDialogProps) => {
  if (!row) return null;

  const turno = getTurno(row.hora);
  // Gatilho está ativo APENAS se há impacto BRUTO (condições climáticas no momento)
  // Impacto de decay não conta como gatilho ativo
  const hasActiveTrigger = row.uplift_bt_raw_pct > 0 || row.uplift_mt_raw_pct > 0;

  const DataRow = ({ label, value, color, subtext }: { label: string; value: string | number; color?: string; subtext?: string }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-border/20">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="text-right">
        <span className={cn("font-medium text-sm", color)}>{value}</span>
        {subtext && <span className="text-xs text-muted-foreground ml-1">{subtext}</span>}
      </div>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, color }: { icon: any; title: string; color?: string }) => (
    <div className={cn("flex items-center gap-2 mb-3 font-semibold text-sm", color)}>
      <Icon className="w-4 h-4" />
      {title}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">
              {row.dia > 0 && <span className="text-muted-foreground mr-1">D{row.dia + 1}</span>}
              {String(row.hora).padStart(2, "0")}:00
            </span>
            <span className={cn("turno-badge text-xs", `turno-${turno.toLowerCase()}`)}>
              Turno {turno}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-2">
          {/* Clima e Gatilhos */}
          <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <SectionTitle icon={CloudRain} title="Clima e Gatilhos" color="text-blue-400" />
            <DataRow label="Temperatura" value={`${row.temp_c.toFixed(0)}°C`} />
            <DataRow label="Precipitação" value={`${row.precip_mm.toFixed(1)} mm`} />
            <DataRow label="Vento" value={`${row.wind_kmh.toFixed(0)} km/h`} />
            <DataRow label="Rajada" value={`${row.gust_kmh.toFixed(0)} km/h`} color={row.gust_kmh >= 30 ? "text-orange-400" : undefined} />
            <DataRow 
              label="Faixa de Chuva" 
              value={getFaixaChuvaLabel(row.precip_mm)} 
              color={row.precip_mm >= 0.2 ? "text-blue-400" : "text-muted-foreground"}
            />
            <DataRow 
              label="Gatilho Ativo" 
              value={hasActiveTrigger ? "Sim" : "Não"} 
              color={hasActiveTrigger ? "text-warning" : "text-success"}
            />
            <DataRow 
              label="Impacto BT (climático)" 
              value={`+${row.uplift_bt_raw_pct.toFixed(1)}%`} 
              color={row.uplift_bt_raw_pct > 0 ? "text-orange-400" : undefined}
            />
            <DataRow 
              label="Impacto MT (climático)" 
              value={`+${row.uplift_mt_raw_pct.toFixed(1)}%`} 
              color={row.uplift_mt_raw_pct > 0 ? "text-orange-400" : undefined}
            />
            <DataRow 
              label="Impacto BT (final)" 
              value={`+${row.uplift_bt_pct.toFixed(1)}%`} 
              color={row.uplift_bt_pct > 0 ? "text-warning" : undefined}
            />
            <DataRow 
              label="Impacto MT (final)" 
              value={`+${row.uplift_mt_pct.toFixed(1)}%`} 
              color={row.uplift_mt_pct > 0 ? "text-warning" : undefined}
            />
          </div>

          {/* Half-Life / Decay */}
          <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <SectionTitle icon={Timer} title="Half-Life (Decay)" color="text-amber-400" />
            {row.tslr !== null ? (
              <>
                <DataRow 
                  label="Horas após chuva" 
                  value={`${row.tslr}h`} 
                  color="text-amber-400"
                />
                <DataRow 
                  label="Episódio anterior" 
                  value={`${row.lastEpisodeSumMm?.toFixed(1) ?? 0} mm`} 
                />
                <DataRow 
                  label="Categoria" 
                  value={getHalfLifeBucket(row.lastEpisodeSumMm ?? 0)} 
                />
                <DataRow 
                  label="Fator de decay" 
                  value={`${(row.decayMultiplier * 100).toFixed(0)}%`} 
                  color={row.decayMultiplier < 0.5 ? "text-success" : "text-amber-400"}
                />
                {(row.uplift_bt_pct > 0 || row.uplift_mt_pct > 0) ? (
                  <div className="mt-3 p-2 rounded bg-secondary/50 text-xs text-muted-foreground">
                    <p>Impacto residual BT: <span className="text-warning">{row.uplift_bt_pct.toFixed(0)}%</span></p>
                    <p className="mt-1">Impacto residual MT: <span className="text-warning">{row.uplift_mt_pct.toFixed(0)}%</span></p>
                    <p className="mt-1 text-amber-400">Decaindo com half-life baseado no episódio anterior</p>
                  </div>
                ) : (
                  <div className="mt-3 p-2 rounded bg-secondary/50 text-xs text-muted-foreground">
                    <p>Impacto residual da chuva anterior já decaiu completamente.</p>
                    <p className="mt-1 text-success">Nenhum uplift de chuva aplicado nesta hora.</p>
                  </div>
                )}
              </>
            ) : row.precip_mm >= 0.2 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                <CloudRain className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p>Chuva ativa</p>
                <p className="mt-1">Impacto total aplicado</p>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                <p>Sem episódio de chuva anterior</p>
                <p className="mt-1">Decay não aplicável</p>
              </div>
            )}
          </div>

          {/* Equipes */}
          <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <SectionTitle icon={Users} title="Equipes" color="text-emerald-400" />
            <DataRow label="Equipes Totais" value={row.eq_disp} />
            <DataRow label="Equipes para MT" value={row.eq_mt} color="text-purple-400" />
            <DataRow label="Equipes para BT" value={row.eq_bt} color="text-cyan-400" />
            <DataRow label="Eq. BT (só BT)" value={row.eq_perdas} color="text-amber-400" />
            <DataRow 
              label="Equipes Ideais" 
              value={row.eq_ideal_total} 
              color="text-success"
              subtext="p/ meta"
            />
            <div className="pt-2 mt-2 border-t border-border/30">
              <DataRow label="Prod. BT" value={`${row.bt_productivity.toFixed(2)}/eq/8h`} />
              <DataRow label="Prod. MT" value={`${row.mt_productivity.toFixed(2)}/eq/8h`} />
            </div>
          </div>

          {/* Entradas de Incidentes */}
          <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <SectionTitle icon={TrendingUp} title="Entradas" color="text-orange-400" />
            <DataRow 
              label="Entrada BT (base)" 
              value={row.entrada_bt_base.toFixed(1)} 
            />
            <DataRow 
              label="Entrada BT (ajust.)" 
              value={row.entrada_bt_adj.toFixed(1)} 
              color="text-cyan-400"
              subtext={row.uplift_bt_pct > 0 ? `+${row.uplift_bt_pct.toFixed(0)}%` : undefined}
            />
            <DataRow 
              label="Entrada MT (base)" 
              value={row.entrada_mt_base.toFixed(1)} 
            />
            <DataRow 
              label="Entrada MT (ajust.)" 
              value={row.entrada_mt_adj.toFixed(1)} 
              color="text-purple-400"
              subtext={row.uplift_mt_pct > 0 ? `+${row.uplift_mt_pct.toFixed(0)}%` : undefined}
            />
            <div className="pt-2 mt-2 border-t border-border/30">
              <DataRow label="Ret. Operador BT" value={row.ret_op_bt.toFixed(1)} color="text-green-400" />
              <DataRow label="Ret. Operador MT" value={row.ret_op_mt.toFixed(1)} color="text-green-400" />
            </div>
          </div>

          {/* Saldos */}
          <div className="space-y-1 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <SectionTitle icon={Target} title="Saldos" color="text-primary" />
            <div className="text-xs text-muted-foreground mb-2">Metas: BT=70, MT=10</div>
            <DataRow 
              label="Capacidade BT/h" 
              value={row.cap_bt_h.toFixed(1)} 
              color="text-cyan-400" 
            />
            <DataRow 
              label="Capacidade MT/h" 
              value={row.cap_mt_h.toFixed(1)} 
              color="text-purple-400" 
            />
            <DataRow 
              label="Saldo BT" 
              value={row.incidentes_bt_saldo} 
              color={row.incidentes_bt_saldo > 150 ? "text-destructive" : row.incidentes_bt_saldo > 70 ? "text-warning" : "text-success"}
            />
            <DataRow 
              label="Saldo MT" 
              value={row.incidentes_mt_saldo} 
              color={row.incidentes_mt_saldo > 15 ? "text-destructive" : row.incidentes_mt_saldo > 10 ? "text-warning" : "text-success"}
            />
            <div className="pt-2 mt-2 border-t border-border/30">
              <DataRow 
                label="Saldo BT (ideal)" 
                value={Math.round(row.saldo_bt_ideal)} 
                color="text-success"
              />
              <DataRow 
                label="Saldo MT (ideal)" 
                value={Math.round(row.saldo_mt_ideal)} 
                color="text-success"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
