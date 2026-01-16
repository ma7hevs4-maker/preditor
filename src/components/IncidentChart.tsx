import { SimulationRow } from "@/hooks/useSimulation";
import { useState, useMemo } from "react";
import {
  Area,
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
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface IncidentChartProps {
  data: SimulationRow[];
}

type ViewMode = "BT" | "MT" | "BOTH";

export const IncidentChart = ({ data }: IncidentChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("BOTH");
  const [showSaldo, setShowSaldo] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 0.5 = 50%, 2 = 200%

  const chartData = data.map((row) => {
    const entradaBT = row.entrada_bt_adj;
    const entradaMT = row.entrada_mt_adj;
    const retiradaBT = Math.round(row.ret_op_bt + row.cap_bt_h);
    const retiradaMT = Math.round(row.ret_op_mt + row.cap_mt_h);
    const entradaBTBase = row.uplift_bt_pct > 0 ? row.entrada_bt_base : null;
    const entradaMTBase = row.uplift_mt_pct > 0 ? row.entrada_mt_base : null;
    
    return {
      hora: row.dia > 0 
        ? `D${row.dia + 1} ${String(row.hora).padStart(2, "0")}h` 
        : `${String(row.hora).padStart(2, "0")}h`,
      // Valores individuais
      "Saldo BT": row.incidentes_bt_saldo,
      "Saldo MT": row.incidentes_mt_saldo,
      "Entrada BT": entradaBT,
      "Entrada MT": entradaMT,
      "Retirada BT": retiradaBT,
      "Retirada MT": retiradaMT,
      "Entrada BT Base": entradaBTBase,
      "Entrada MT Base": entradaMTBase,
      // Valores combinados (para modo "Ambos")
      "Saldo Total": row.incidentes_bt_saldo + row.incidentes_mt_saldo,
      "Entrada Total": Math.round(entradaBT + entradaMT),
      "Retirada Total": retiradaBT + retiradaMT,
      "Entrada Base": (entradaBTBase !== null || entradaMTBase !== null) 
        ? Math.round((entradaBTBase ?? entradaBT) + (entradaMTBase ?? entradaMT))
        : null,
    };
  });

  const btColor = "hsl(190, 95%, 50%)";
  const mtColor = "hsl(280, 70%, 60%)";
  const combinedColor = "hsl(220, 80%, 60%)";
  const btEntradaColor = "hsl(45, 93%, 47%)";
  const mtEntradaColor = "hsl(340, 80%, 55%)";
  const combinedEntradaColor = "hsl(35, 90%, 50%)";
  const btRetiradaColor = "hsl(120, 60%, 45%)";
  const mtRetiradaColor = "hsl(160, 60%, 50%)";
  const combinedRetiradaColor = "hsl(140, 65%, 45%)";

  const showBT = viewMode === "BT";
  const showMT = viewMode === "MT";
  const showCombined = viewMode === "BOTH";

  // Calcula o domínio Y baseado nos dados e zoom
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    let maxValue = 0;
    chartData.forEach((row) => {
      if (showCombined) {
        if (showSaldo) maxValue = Math.max(maxValue, row["Saldo Total"] || 0);
        maxValue = Math.max(maxValue, row["Entrada Total"] || 0, row["Retirada Total"] || 0);
      } else if (showBT) {
        if (showSaldo) maxValue = Math.max(maxValue, row["Saldo BT"] || 0);
        maxValue = Math.max(maxValue, row["Entrada BT"] || 0, row["Retirada BT"] || 0);
      } else if (showMT) {
        if (showSaldo) maxValue = Math.max(maxValue, row["Saldo MT"] || 0);
        maxValue = Math.max(maxValue, row["Entrada MT"] || 0, row["Retirada MT"] || 0);
      }
    });
    
    // Aplica zoom (zoom > 1 = menos espaço vertical, zoom < 1 = mais espaço)
    const adjustedMax = Math.ceil((maxValue * 1.1) / zoomLevel);
    return [0, Math.max(adjustedMax, 10)];
  }, [chartData, viewMode, showSaldo, zoomLevel, showBT, showMT, showCombined]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.5, 4));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.5, 0.25));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="glass-card p-5 animate-slide-up h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Evolução de Incidentes</h3>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Diminuir zoom (ver mais)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className={`p-1.5 rounded transition-colors ${
                zoomLevel === 1 
                  ? "text-muted-foreground/50 cursor-default" 
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
              title="Resetar zoom"
              disabled={zoomLevel === 1}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Aumentar zoom (ver menos)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowSaldo(!showSaldo)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              showSaldo 
                ? "bg-primary/20 border-primary text-primary" 
                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Saldo
          </button>
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
              <linearGradient id="colorSaldoCombined" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={combinedColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={combinedColor} stopOpacity={0} />
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
              domain={yDomain}
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
            {/* Modo Combinado (Ambos) - 3 linhas com soma */}
            {showCombined && (
              <>
                {showSaldo && (
                  <Area
                    type="monotone"
                    dataKey="Saldo Total"
                    stroke={combinedColor}
                    fillOpacity={1}
                    fill="url(#colorSaldoCombined)"
                    strokeWidth={2}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="Entrada Total"
                  stroke={combinedEntradaColor}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Entrada Base"
                  stroke={combinedEntradaColor}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="Retirada Total"
                  stroke={combinedRetiradaColor}
                  strokeWidth={2}
                  dot={false}
                />
              </>
            )}
            {/* Modo BT - linhas individuais */}
            {showBT && (
              <>
                {showSaldo && (
                  <Area
                    type="monotone"
                    dataKey="Saldo BT"
                    stroke={btColor}
                    fillOpacity={1}
                    fill="url(#colorSaldoBT)"
                    strokeWidth={2}
                  />
                )}
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
            {/* Modo MT - linhas individuais */}
            {showMT && (
              <>
                {showSaldo && (
                  <Area
                    type="monotone"
                    dataKey="Saldo MT"
                    stroke={mtColor}
                    fillOpacity={1}
                    fill="url(#colorSaldoMT)"
                    strokeWidth={2}
                  />
                )}
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