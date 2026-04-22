import React, { useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { UTS_POLOS, UTN_POLOS, POLO_TO_UT } from "@/utils/rankingScoring";

interface EvolucaoTemporalViewProps {
  filteredData: any[];
  onBack: () => void;
  calculateOccupancy: (eqData: any[]) => number;
  calculateIdleMinutes: (eqData: any[]) => number;
  calcTempoPlataforma: (eqData: any[]) => number | null;
  calcRetornoBase: (eqData: any[]) => number | null;
  getValMinutes: (val: any) => number | null;
  filterTrigger?: React.ReactNode;
}

type Granularidade = "diaria" | "semanal" | "mensal";
type KPIKey =
  | "login"
  | "despacho"
  | "plataforma"
  | "retorno"
  | "ocupacao"
  | "ociosidade"
  | "incidentes";

const KPI_META: Record<
  KPIKey,
  { label: string; unit: string; betterWhen: "lower" | "higher"; format: (v: number) => string; group: "tempos" | "volume" }
> = {
  login: { label: "Login", unit: "min", betterWhen: "lower", format: (v) => `${v.toFixed(0)} min`, group: "tempos" },
  despacho: { label: "Despacho", unit: "min", betterWhen: "lower", format: (v) => `${v.toFixed(0)} min`, group: "tempos" },
  plataforma: { label: "Plataforma", unit: "min", betterWhen: "lower", format: (v) => `${v.toFixed(0)} min`, group: "tempos" },
  retorno: { label: "Retorno", unit: "min", betterWhen: "lower", format: (v) => `${v.toFixed(0)} min`, group: "tempos" },
  ocupacao: { label: "Ocupação", unit: "%", betterWhen: "higher", format: (v) => `${v.toFixed(1)}%`, group: "volume" },
  ociosidade: { label: "Ociosidade", unit: "min/eq", betterWhen: "lower", format: (v) => `${v.toFixed(0)} min`, group: "volume" },
  incidentes: { label: "Incidentes/Equipe", unit: "", betterWhen: "higher", format: (v) => v.toFixed(2), group: "volume" },
};

// ISO week helpers
function getISOWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
function getMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}
function formatBucketLabel(bucket: string, gran: Granularidade): string {
  if (gran === "diaria") {
    const [y, m, d] = bucket.split("-");
    return `${d}/${m}`;
  }
  if (gran === "semanal") {
    const [y, w] = bucket.split("-W");
    return `Sem ${w}/${y.slice(2)}`;
  }
  const [y, m] = bucket.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(m) - 1]}/${y.slice(2)}`;
}

function matchPoloName(rawPolo: string): string | null {
  if (!rawPolo || rawPolo === "Não informado") return null;
  const allPolos = [...UTS_POLOS, ...UTN_POLOS];
  if (allPolos.includes(rawPolo)) return rawPolo;
  const normalized = rawPolo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const polo of allPolos) {
    const poloNorm = polo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(poloNorm) || poloNorm.includes(normalized)) {
      return polo;
    }
  }
  return rawPolo;
}

// Distinct colors for each polo line (uses HSL semantic-friendly hues)
const POLO_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 70%, 60%)",
  "hsl(173, 80%, 40%)",
  "hsl(25, 95%, 53%)",
  "hsl(330, 81%, 60%)",
];

export function EvolucaoTemporalView({
  filteredData,
  onBack,
  calculateOccupancy,
  calculateIdleMinutes,
  calcTempoPlataforma,
  calcRetornoBase,
  getValMinutes,
  filterTrigger,
}: EvolucaoTemporalViewProps) {
  const [granularidade, setGranularidade] = useState<Granularidade>("mensal");
  const [selectedKPI, setSelectedKPI] = useState<KPIKey>("plataforma");
  const [selectedUT, setSelectedUT] = useState<"UTS" | "UTN" | "TODOS">("TODOS");

  // Group data by bucket × polo
  const aggregated = useMemo(() => {
    const buckets = new Map<string, Map<string, any[]>>();
    filteredData.forEach((d) => {
      const dateStr = d["Data Turno"] || d["Data Ação"];
      if (!dateStr) return;
      const polo = matchPoloName(d.Polo);
      if (!polo) return;
      const bucketKey =
        granularidade === "diaria"
          ? dateStr
          : granularidade === "semanal"
            ? getISOWeek(dateStr)
            : getMonth(dateStr);
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, new Map());
      const poloMap = buckets.get(bucketKey)!;
      if (!poloMap.has(polo)) poloMap.set(polo, []);
      poloMap.get(polo)!.push(d);
    });
    return buckets;
  }, [filteredData, granularidade]);

  const allBuckets = useMemo(() => Array.from(aggregated.keys()).sort(), [aggregated]);
  const allPolos = useMemo(() => {
    const s = new Set<string>();
    aggregated.forEach((poloMap) => poloMap.forEach((_, polo) => s.add(polo)));
    return Array.from(s).filter((p) => {
      if (selectedUT === "TODOS") return true;
      return POLO_TO_UT[p] === selectedUT;
    }).sort();
  }, [aggregated, selectedUT]);

  // Compute KPIs for one (bucket, polo)
  const computeKPIs = (bucketData: any[]): Record<KPIKey, number | null> => {
    if (bucketData.length === 0) {
      return { login: null, despacho: null, plataforma: null, retorno: null, ocupacao: null, ociosidade: null, incidentes: null };
    }
    const equipes = Array.from(new Set(bucketData.map((d) => d["Equipe Desl."]).filter(Boolean))).filter(
      (eq) => eq !== "Não informado" && eq !== "---",
    );
    const loginVals: number[] = [];
    const despVals: number[] = [];
    const platVals: number[] = [];
    const retVals: number[] = [];
    const occVals: number[] = [];
    const idleVals: number[] = [];

    equipes.forEach((eq) => {
      const eqData = bucketData.filter((d) => d["Equipe Desl."] === eq);
      // group by date so per-day per-team metrics make sense
      const byDate: Record<string, any[]> = {};
      eqData.forEach((d) => {
        const dt = d["Data Turno"] || d["Data Ação"];
        if (!dt) return;
        if (!byDate[dt]) byDate[dt] = [];
        byDate[dt].push(d);
      });
      Object.values(byDate).forEach((dayData) => {
        let maxLogin: number | null = null;
        let maxDesp: number | null = null;
        dayData.forEach((d) => {
          const v = getValMinutes(d["1º Login Corrigido"]);
          if (v != null && (maxLogin === null || v > maxLogin)) maxLogin = v;
          const vd = getValMinutes(d["1º Despacho"]);
          if (vd != null && (maxDesp === null || vd > maxDesp)) maxDesp = vd;
        });
        if (maxLogin !== null) loginVals.push(maxLogin);
        if (maxDesp !== null) despVals.push(maxDesp);
        const plat = calcTempoPlataforma(dayData);
        if (plat != null) platVals.push(plat);
        const ret = calcRetornoBase(dayData);
        if (ret != null) retVals.push(ret);
        const occ = calculateOccupancy(dayData);
        if (occ > 0 && occ <= 120) occVals.push(occ);
        idleVals.push(calculateIdleMinutes(dayData));
      });
    });

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const totalInc = new Set(bucketData.map((d) => d.Número)).size;
    const incPerEq = equipes.length > 0 ? totalInc / equipes.length : null;

    return {
      login: avg(loginVals),
      despacho: avg(despVals),
      plataforma: avg(platVals),
      retorno: avg(retVals),
      ocupacao: avg(occVals),
      ociosidade: avg(idleVals),
      incidentes: incPerEq,
    };
  };

  // Build series: { bucket, [polo]: value }
  const seriesData = useMemo(() => {
    return allBuckets.map((bucket) => {
      const row: Record<string, any> = { bucket, label: formatBucketLabel(bucket, granularidade) };
      const poloMap = aggregated.get(bucket)!;
      allPolos.forEach((polo) => {
        const data = poloMap.get(polo) || [];
        const kpis = computeKPIs(data);
        row[polo] = kpis[selectedKPI];
      });
      return row;
    });
  }, [allBuckets, aggregated, allPolos, selectedKPI, granularidade]);

  // Variation cards: last bucket vs previous bucket per polo (using selected KPI)
  const variationCards = useMemo(() => {
    if (allBuckets.length < 1) return [];
    const lastBucket = allBuckets[allBuckets.length - 1];
    const prevBucket = allBuckets.length >= 2 ? allBuckets[allBuckets.length - 2] : null;
    return allPolos.map((polo) => {
      const lastData = aggregated.get(lastBucket)?.get(polo) || [];
      const lastKPI = computeKPIs(lastData)[selectedKPI];
      const prevData = prevBucket ? aggregated.get(prevBucket)?.get(polo) || [] : [];
      const prevKPI = prevBucket ? computeKPIs(prevData)[selectedKPI] : null;

      let deltaPct: number | null = null;
      if (lastKPI !== null && prevKPI !== null && prevKPI !== 0) {
        deltaPct = ((lastKPI - prevKPI) / Math.abs(prevKPI)) * 100;
      }

      // Sparkline series
      const spark = allBuckets.map((b) => {
        const data = aggregated.get(b)?.get(polo) || [];
        return computeKPIs(data)[selectedKPI];
      });

      return { polo, lastKPI, prevKPI, deltaPct, spark };
    });
  }, [allBuckets, aggregated, allPolos, selectedKPI]);

  const meta = KPI_META[selectedKPI];

  const getDeltaClass = (delta: number | null): string => {
    if (delta === null) return "text-muted-foreground";
    const isImproving = meta.betterWhen === "lower" ? delta < 0 : delta > 0;
    if (Math.abs(delta) < 0.5) return "text-muted-foreground";
    return isImproving ? "text-success" : "text-destructive";
  };

  const getDeltaIcon = (delta: number | null) => {
    if (delta === null || Math.abs(delta) < 0.5) return <Minus className="h-3.5 w-3.5" />;
    const isImproving = meta.betterWhen === "lower" ? delta < 0 : delta > 0;
    if (isImproving) return <TrendingUp className="h-3.5 w-3.5" />;
    return <TrendingDown className="h-3.5 w-3.5" />;
  };

  const lastBucketLabel = allBuckets.length > 0 ? formatBucketLabel(allBuckets[allBuckets.length - 1], granularidade) : "—";
  const prevBucketLabel = allBuckets.length >= 2 ? formatBucketLabel(allBuckets[allBuckets.length - 2], granularidade) : null;

  return (
    <div className="h-screen w-full min-w-0 max-w-full bg-background flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 sm:px-6 py-3 flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            Evolução Temporal
          </h1>
          <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
            Base atual • {filteredData.length.toLocaleString("pt-BR")} linhas
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {filterTrigger}

          {/* UT Toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {(["TODOS", "UTS", "UTN"] as const).map((ut) => (
              <button
                key={ut}
                onClick={() => setSelectedUT(ut)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedUT === ut
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {ut}
              </button>
            ))}
          </div>

          {/* Granularidade toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {(["diaria", "semanal", "mensal"] as Granularidade[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularidade(g)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                  granularidade === g
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {g === "diaria" ? "Diária" : g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Selector */}
      <div className="shrink-0 px-3 sm:px-6 py-3 border-b border-border bg-card/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">KPI:</span>
          {(Object.keys(KPI_META) as KPIKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSelectedKPI(k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                selectedKPI === k
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {KPI_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
        {allBuckets.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Sem dados para exibir. Verifique se a base atual cobre múltiplos períodos.</p>
          </div>
        ) : (
          <>
            {/* Variation Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">
                  Variação do KPI {meta.label} — {lastBucketLabel}
                  {prevBucketLabel && <span className="text-muted-foreground font-normal"> vs {prevBucketLabel}</span>}
                </h2>
                <span className="text-[10px] text-muted-foreground">
                  {meta.betterWhen === "lower" ? "↓ menor é melhor" : "↑ maior é melhor"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {variationCards.map(({ polo, lastKPI, deltaPct, spark }, idx) => {
                  const color = POLO_COLORS[idx % POLO_COLORS.length];
                  const validSpark = spark.filter((v): v is number => v !== null);
                  const minS = validSpark.length > 0 ? Math.min(...validSpark) : 0;
                  const maxS = validSpark.length > 0 ? Math.max(...validSpark) : 1;
                  const range = maxS - minS || 1;
                  return (
                    <div key={polo} className="glass-card p-3 flex flex-col gap-2 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs font-semibold text-foreground truncate">{polo}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                          {POLO_TO_UT[polo] || "—"}
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold font-mono text-foreground">
                          {lastKPI !== null ? meta.format(lastKPI) : "—"}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${getDeltaClass(deltaPct)}`}>
                        {getDeltaIcon(deltaPct)}
                        <span>
                          {deltaPct !== null
                            ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`
                            : "Sem comparação"}
                        </span>
                      </div>
                      {/* Sparkline */}
                      {spark.length > 1 && (
                        <svg viewBox="0 0 100 24" className="w-full h-6 mt-1" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={spark
                              .map((v, i) => {
                                if (v === null) return null;
                                const x = (i / (spark.length - 1)) * 100;
                                const y = 22 - ((v - minS) / range) * 20;
                                return `${x},${y}`;
                              })
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Line Chart */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">
                  Evolução {granularidade === "diaria" ? "Diária" : granularidade === "semanal" ? "Semanal" : "Mensal"} — {meta.label}
                </h2>
                <span className="text-[10px] text-muted-foreground">{allBuckets.length} períodos • {allPolos.length} polos</span>
              </div>
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      stroke="hsl(var(--border))"
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      stroke="hsl(var(--border))"
                      tickFormatter={(v) => meta.format(v)}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      formatter={(value: any) => (value === null ? "—" : meta.format(Number(value)))}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      iconType="circle"
                    />
                    {allPolos.map((polo, idx) => (
                      <Line
                        key={polo}
                        type="monotone"
                        dataKey={polo}
                        stroke={POLO_COLORS[idx % POLO_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Helper note */}
            <div className="text-[11px] text-muted-foreground text-center px-4">
              💡 Análise feita sobre a base atualmente carregada. Para comparar com bases anteriores, faça upload do consolidado completo
              do período desejado.
            </div>
          </>
        )}
      </div>
    </div>
  );
}