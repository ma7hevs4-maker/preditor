import { HourlyData } from "@/data/mockPlanningData";
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
  data: HourlyData[];
  type: "BT" | "MT";
}

export const IncidentChart = ({ data, type }: IncidentChartProps) => {
  const chartData = data.map((row) => ({
    hora: `${String(row.hora).padStart(2, "0")}h`,
    "Saldo Disponível":
      type === "BT" ? row.incidentes_bt_saldo_disp : row.incidentes_mt_saldo_disp,
    "Saldo Ideal":
      type === "BT" ? row.incidentes_bt_saldo_ideal : row.incidentes_mt_saldo_ideal,
    Entrada: type === "BT" ? row.entrada_bt_adj : row.entrada_mt_adj,
  }));

  const primaryColor = type === "BT" ? "hsl(190, 95%, 50%)" : "hsl(280, 70%, 60%)";
  const secondaryColor = type === "BT" ? "hsl(142, 76%, 36%)" : "hsl(320, 70%, 50%)";

  return (
    <div className="glass-card p-5 animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">
        Evolução de Incidentes - {type === "BT" ? "Baixa Tensão" : "Média Tensão"}
      </h3>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorDisp${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`colorIdeal${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
            <XAxis
              dataKey="hora"
              stroke="hsl(215, 20%, 55%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
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
              dataKey="Saldo Disponível"
              stroke={primaryColor}
              fillOpacity={1}
              fill={`url(#colorDisp${type})`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Saldo Ideal"
              stroke={secondaryColor}
              fillOpacity={1}
              fill={`url(#colorIdeal${type})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
