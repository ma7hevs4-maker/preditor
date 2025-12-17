import { SimulationRow } from "@/hooks/useSimulation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CloudRain, Thermometer, Wind, Users, TrendingDown, TrendingUp, Target } from "lucide-react";
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

const getFaixaChuvaLabel = (mm: number): string => {
  if (mm < 0.2) return "Seco";
  if (mm < 1.0) return "Leve (0.2-1mm)";
  if (mm < 5.0) return "Moderada (1-5mm)";
  if (mm < 10.0) return "Forte (5-10mm)";
  return "Muito Forte (>10mm)";
};

export const HourDetailDialog = ({ row, open, onOpenChange }: HourDetailDialogProps) => {
  if (!row) return null;

  const turno = getTurno(row.hora);
  const hasRainTrigger = row.precip_mm >= 0.2;

  const DataRow = ({ label, value, color, subtext }: { label: string; value: string | number; color?: string; subtext?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-border/20">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="text-right">
        <span className={cn("font-medium", color)}>{value}</span>
        {subtext && <span className="text-xs text-muted-foreground ml-1">{subtext}</span>}
      </div>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, color }: { icon: any; title: string; color?: string }) => (
    <div className={cn("flex items-center gap-2 mt-4 mb-2 font-semibold", color)}>
      <Icon className="w-4 h-4" />
      {title}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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

        <div className="space-y-1">
          {/* Clima e Gatilhos */}
          <SectionTitle icon={CloudRain} title="Clima e Gatilhos" color="text-blue-400" />
          <DataRow label="Temperatura" value={`${row.temp_c.toFixed(0)}°C`} />
          <DataRow label="Precipitação" value={`${row.precip_mm.toFixed(1)} mm`} />
          <DataRow label="Vento" value={`${row.wind_ms.toFixed(1)} m/s`} />
          <DataRow 
            label="Faixa de Chuva" 
            value={getFaixaChuvaLabel(row.precip_mm)} 
            color={hasRainTrigger ? "text-blue-400" : "text-muted-foreground"}
          />
          <DataRow 
            label="Gatilho Ativo" 
            value={hasRainTrigger ? "Sim" : "Não"} 
            color={hasRainTrigger ? "text-warning" : "text-success"}
          />
          <DataRow 
            label="Impacto BT" 
            value={`+${row.uplift_bt_pct.toFixed(1)}%`} 
            color={row.uplift_bt_pct > 0 ? "text-warning" : undefined}
          />
          <DataRow 
            label="Impacto MT" 
            value={`+${row.uplift_mt_pct.toFixed(1)}%`} 
            color={row.uplift_mt_pct > 0 ? "text-warning" : undefined}
          />

          {/* Equipes */}
          <SectionTitle icon={Users} title="Equipes" color="text-emerald-400" />
          <DataRow label="Equipes Totais" value={row.eq_disp} />
          <DataRow label="Equipes para MT" value={row.eq_mt} color="text-purple-400" />
          <DataRow label="Equipes para BT" value={row.eq_bt} color="text-cyan-400" />
          <DataRow label="Equipes de Perdas (só BT)" value={row.eq_perdas} color="text-amber-400" />
          <DataRow 
            label="Equipes Ideais (total)" 
            value={row.eq_ideal_total} 
            color="text-success"
            subtext="p/ atingir meta"
          />

          {/* Entradas */}
          <SectionTitle icon={TrendingUp} title="Entradas de Incidentes" color="text-orange-400" />
          <DataRow 
            label="Entrada BT (base)" 
            value={row.entrada_bt_base.toFixed(1)} 
          />
          <DataRow 
            label="Entrada BT (ajustada)" 
            value={row.entrada_bt_adj.toFixed(1)} 
            color="text-cyan-400"
            subtext={row.uplift_bt_pct > 0 ? `(+${row.uplift_bt_pct.toFixed(0)}%)` : undefined}
          />
          <DataRow 
            label="Entrada MT (base)" 
            value={row.entrada_mt_base.toFixed(1)} 
          />
          <DataRow 
            label="Entrada MT (ajustada)" 
            value={row.entrada_mt_adj.toFixed(1)} 
            color="text-purple-400"
            subtext={row.uplift_mt_pct > 0 ? `(+${row.uplift_mt_pct.toFixed(0)}%)` : undefined}
          />

          {/* Produtividade */}
          <DataRow label="Produtividade BT" value={`${row.bt_productivity.toFixed(2)} /eq/8h`} />
          <DataRow label="Produtividade MT" value={`${row.mt_productivity.toFixed(2)} /eq/8h`} />
          <DataRow label="Capacidade BT/h" value={row.cap_bt_h.toFixed(1)} color="text-cyan-400" />
          <DataRow label="Capacidade MT/h" value={row.cap_mt_h.toFixed(1)} color="text-purple-400" />

          {/* Saldos */}
          <SectionTitle icon={Target} title="Saldos (Metas: BT=70, MT=10)" color="text-primary" />
          <DataRow 
            label="Saldo BT (configurado)" 
            value={row.incidentes_bt_saldo} 
            color={row.incidentes_bt_saldo > 70 ? "text-destructive" : "text-success"}
          />
          <DataRow 
            label="Saldo MT (configurado)" 
            value={row.incidentes_mt_saldo} 
            color={row.incidentes_mt_saldo > 10 ? "text-destructive" : "text-success"}
          />
          <div className="border-t border-border/40 mt-2 pt-2">
            <DataRow 
              label="Saldo BT (c/ eq. ideais)" 
              value={Math.round(row.saldo_bt_ideal)} 
              color="text-success"
            />
            <DataRow 
              label="Saldo MT (c/ eq. ideais)" 
              value={Math.round(row.saldo_mt_ideal)} 
              color="text-success"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
