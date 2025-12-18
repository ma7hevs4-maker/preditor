import { SimulationRow } from "@/hooks/useSimulation";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface IncidentChartProps {
  data: SimulationRow[];
}

type ViewMode = "BT" | "MT" | "BOTH";

export const IncidentChart = ({ data }: IncidentChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("BOTH");

  const chartData = data.map((row) => ({
    hora: row.dia > 0 
      ? `D${row.dia + 1} ${String(row.hora).padStart(2, "0")}h` 
      : `${String(row.hora).padStart(2, "0")}h`,
    "Saldo BT": row.incidentes_bt_saldo,
    "Saldo MT": row.incidentes_mt_saldo,
    "Entrada BT": row.entrada_bt_adj,
    "Entrada MT": row.entrada_mt_adj,
    "Retirada BT": Math.round(row.ret_op_bt + row.cap_bt_h),
    "Retirada MT": Math.round(row.ret_op_mt + row.cap_mt_h),
    // Entrada base (sem impacto clima) - só mostra se houver uplift
    "Entrada BT Base": row.uplift_bt_pct > 0 ? row.entrada_bt_base : null,
    "Entrada MT Base": row.uplift_mt_pct > 0 ? row.entrada_mt_base : null,
  }));

  const btColor = "hsl(190, 95%, 50%)";
  const mtColor = "hsl(280, 70%, 60%)";
  const btEntradaColor = "hsl(45, 93%, 47%)";
  const mtEntradaColor = "hsl(340, 80%, 55%)";
  const btRetiradaColor = "hsl(120, 60%, 45%)";
  const mtRetiradaColor = "hsl(160, 60%, 50%)";

  const showBT = viewMode === "BT" || viewMode === "BOTH";
  const showMT = viewMode === "MT" || viewMode === "BOTH";

  return (
    <div className="glass-card p-5 animate-slide-up h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Evolução de Incidentes</h3>
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          className="bg-muted/30 p-1 rounded-lg"
        >
          <ToggleGroupItem 
            value="BOTH" 
            className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Ambos
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="BT" 
            className="text-xs px-3 data-[state=on]:bg-cyan-500 data-[state=on]:text-white"
          >
            BT
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="MT" 
            className="text-xs px-3 data-[state=on]:bg-purple-500 data-[state=on]:text-white"
          >
            MT
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaldoBT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={btColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={btColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaldoMT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mtColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={mtColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
            <XAxis
              dataKey="hora"
              stroke="hsl(215, 20%, 55%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(215, 20%, 55%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 9%)",
                border: "1px solid hsl(222, 30%, 20%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
              }}
              labelStyle={{ color: "hsl(210, 40%, 96%)" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span style={{ color: "hsl(215, 20%, 55%)" }}>{value}</span>
              )}
            />
            {showBT && (
              <>
                <Area
                  type="monotone"
                  dataKey="Saldo BT"
                  stroke={btColor}
                  fillOpacity={1}
                  fill="url(#colorSaldoBT)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Entrada BT"
                  stroke={btEntradaColor}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Entrada BT Base"
                  stroke={btEntradaColor}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="Retirada BT"
                  stroke={btRetiradaColor}
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}
            {showMT && (
              <>
                <Area
                  type="monotone"
                  dataKey="Saldo MT"
                  stroke={mtColor}
                  fillOpacity={1}
                  fill="url(#colorSaldoMT)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="Entrada MT"
                  stroke={mtEntradaColor}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Entrada MT Base"
                  stroke={mtEntradaColor}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="Retirada MT"
                  stroke={mtRetiradaColor}
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};