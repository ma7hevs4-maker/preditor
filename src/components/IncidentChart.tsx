import { SimulationRow } from "@/hooks/useSimulation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

interface IncidentChartProps {
  data: SimulationRow[];
  type: "BT" | "MT";
}

export const IncidentChart = ({ data, type }: IncidentChartProps) => {
  const chartData = data.map((row) => ({
    hora: row.dia > 0 
      ? `D${row.dia + 1} ${String(row.hora).padStart(2, "0")}h` 
      : `${String(row.hora).padStart(2, "0")}h`,
    "Saldo": type === "BT" ? row.incidentes_bt_saldo : row.incidentes_mt_saldo,
    "Entrada": type === "BT" ? row.entrada_bt_adj : row.entrada_mt_adj,
    "Chuva (mm)": row.precip_mm,
  }));

  const primaryColor = type === "BT" ? "hsl(190, 95%, 50%)" : "hsl(280, 70%, 60%)";
  const entradaColor = "hsl(45, 93%, 47%)";

  return (
    <div className="glass-card p-5 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">
        Evolução de Incidentes - {type === "BT" ? "Baixa Tensão" : "Média Tensão"}
      </h3>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorSaldo${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`colorEntrada${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={entradaColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={entradaColor} stopOpacity={0} />
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
            <Area
              type="monotone"
              dataKey="Saldo"
              stroke={primaryColor}
              fillOpacity={1}
              fill={`url(#colorSaldo${type})`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Entrada"
              stroke={entradaColor}
              fillOpacity={1}
              fill={`url(#colorEntrada${type})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
