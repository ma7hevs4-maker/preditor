import React, { useState, useMemo } from "react";
import { ArrowLeft, Trophy, AlertTriangle, Clock, BarChart3, XCircle, LogIn, Navigation, Timer, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UTS_POLOS, UTN_POLOS, POLO_TO_UT, calculateRankingScores, RankingWeights, TeamRankingData } from "@/utils/rankingScoring";
import { isReincidenteCausadoRow } from "@/utils/meuDataProcessing";

interface PoloAnalysisViewProps {
  filteredData: any[];
  onBack: () => void;
  weights: RankingWeights;
  isPeriodMode: boolean;
  numDays: number;
  calculateOccupancy: (eqData: any[]) => number;
  calculateIdleMinutes: (eqData: any[]) => number;
  calcTempoPlataforma: (eqData: any[]) => number | null;
  calcRetornoBase: (eqData: any[]) => number | null;
  getValMinutes: (val: any) => number | null;
  onTeamClick: (team: any) => void;
  filterTrigger?: React.ReactNode;
  activeFilterCount?: number;
}

type UT = "UTS" | "UTN";

const processosOrdem = ["Emergência", "Comercial", "Perdas", "Poda", "Linha Viva"];

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

export function PoloAnalysisView({
  filteredData,
  onBack,
  weights,
  isPeriodMode,
  numDays,
  calculateOccupancy,
  calculateIdleMinutes,
  calcTempoPlataforma,
  calcRetornoBase,
  getValMinutes,
  onTeamClick,
  filterTrigger,
  activeFilterCount,
}: PoloAnalysisViewProps) {
  const [selectedUT, setSelectedUT] = useState<UT>("UTS");

  const dataByPolo = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredData.forEach((d) => {
      const rawPolo = d.Polo;
      const polo = matchPoloName(rawPolo);
      if (!polo) return;
      if (!map[polo]) map[polo] = [];
      map[polo].push(d);
    });
    return map;
  }, [filteredData]);

  const knownPolos = selectedUT === "UTS" ? UTS_POLOS : UTN_POLOS;
  const extraPolos = Object.keys(dataByPolo).filter(p => {
    if (knownPolos.includes(p)) return false;
    return POLO_TO_UT[p] === selectedUT;
  });
  const polosToShow = [...knownPolos, ...extraPolos];

  return (
    <div className="h-screen w-full min-w-0 max-w-full bg-background flex flex-col overflow-x-hidden overflow-y-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 sm:px-6 py-3 flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Análise de Polos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter trigger from parent */}
          {filterTrigger}

          {/* UTS/UTN Toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {(["UTS", "UTN"] as UT[]).map((ut) => (
              <button
                key={ut}
                onClick={() => setSelectedUT(ut)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedUT === ut
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
              >
                {ut}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {polosToShow.map((polo) => {
            const poloData = dataByPolo[polo] || [];
            if (poloData.length === 0) {
              return (
                <div key={polo} className="glass-card p-6">
                  <h2 className="text-lg font-bold text-foreground mb-2">{polo}</h2>
                  <p className="text-sm text-muted-foreground">Sem dados para o período selecionado.</p>
                </div>
              );
            }

            return (
              <PoloCard
                key={polo}
                polo={polo}
                data={poloData}
                weights={weights}
                isPeriodMode={isPeriodMode}
                numDays={numDays}
                calculateOccupancy={calculateOccupancy}
                calculateIdleMinutes={calculateIdleMinutes}
                calcTempoPlataforma={calcTempoPlataforma}
                calcRetornoBase={calcRetornoBase}
                getValMinutes={getValMinutes}
                onTeamClick={onTeamClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PoloCard({
  polo,
  data,
  weights,
  isPeriodMode,
  numDays,
  calculateOccupancy,
  calculateIdleMinutes,
  calcTempoPlataforma,
  calcRetornoBase,
  getValMinutes,
  onTeamClick,
}: {
  polo: string;
  data: any[];
  weights: RankingWeights;
  isPeriodMode: boolean;
  numDays: number;
  calculateOccupancy: (eqData: any[]) => number;
  calculateIdleMinutes: (eqData: any[]) => number;
  calcTempoPlataforma: (eqData: any[]) => number | null;
  calcRetornoBase: (eqData: any[]) => number | null;
  getValMinutes: (val: any) => number | null;
  onTeamClick: (team: any) => void;
}) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "pontuacao",
    direction: "desc",
  });

  // KPIs
  const totalInc = new Set(data.map((d) => d.Número)).size;
  const tmdeMedio = data.length > 0 ? data.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) / data.length : 0;
  const reincTotal = data.filter(isReincidenteCausadoRow).length;
  const taxaReinc = totalInc > 0 ? reincTotal / totalInc : 0;
  const improdTotal = data.filter((d) => d.Improdutivo).length;
  const taxaImprod = totalInc > 0 ? improdTotal / totalInc : 0;

  // Compute avg Login, Despacho, T. Plataforma, Retorno Base across teams
  const equipesPresentes = Array.from(new Set(data.map((d) => d["Equipe Desl."]).filter(Boolean))).filter(eq => eq !== "Não informado" && eq !== "---");
  const loginVals: number[] = [];
  const despachoVals: number[] = [];
  const platVals: number[] = [];
  const retVals: number[] = [];
  equipesPresentes.forEach(eq => {
    const eqData = data.filter(d => d["Equipe Desl."] === eq);
    let maxLogin: number | null = null;
    eqData.forEach(d => {
      const val = getValMinutes(d["1º Login Corrigido"]);
      if (val != null && (maxLogin === null || val > maxLogin)) maxLogin = val;
    });
    if (maxLogin !== null) loginVals.push(maxLogin);

    let maxDespacho: number | null = null;
    eqData.forEach(d => {
      const val = getValMinutes(d["1º Despacho"]);
      if (val != null && (maxDespacho === null || val > maxDespacho)) maxDespacho = val;
    });
    if (maxDespacho !== null) despachoVals.push(maxDespacho);

    const plat = calcTempoPlataforma(eqData);
    if (plat !== null) platVals.push(plat);
    const ret = calcRetornoBase(eqData);
    if (ret !== null) retVals.push(ret);
  });

  const avgLogin = loginVals.length > 0 ? loginVals.reduce((a, b) => a + b, 0) / loginVals.length : null;
  const avgDespacho = despachoVals.length > 0 ? despachoVals.reduce((a, b) => a + b, 0) / despachoVals.length : null;
  const avgPlat = platVals.length > 0 ? platVals.reduce((a, b) => a + b, 0) / platVals.length : null;
  const avgRet = retVals.length > 0 ? retVals.reduce((a, b) => a + b, 0) / retVals.length : null;

  // Resultado por Processo
  const resumoProcessos = processosOrdem.map((proc) => {
    const procData = data.filter((d) => d.Processo === proc);
    const inc = new Set(procData.map((d) => d.Número)).size;
    const incProdutivos = new Set(procData.filter((d) => !d.Improdutivo).map((d) => d.Número)).size;
    const imp = procData.filter((d) => d.Improdutivo).length;
    const reinc = procData.filter(isReincidenteCausadoRow).length;

    const uniqueTeams = new Set<string>();
    procData.forEach((d) => {
      const equipeStr = String(d["Equipe Desl."] || "");
      if (!equipeStr || equipeStr === "Não informado") return;
      equipeStr.split(/[/;+]| e /).map((t) => t.trim()).filter((t) => t.length > 0 && t !== "---").forEach((t) => uniqueTeams.add(t));
    });
    const equipesCount = uniqueTeams.size;

    let prodValue: number;
    if (isPeriodMode) {
      const byDate: Record<string, any[]> = {};
      procData.forEach(d => {
        const dt = d["Data Turno"] || d["Data Ação"] || "unknown";
        if (!byDate[dt]) byDate[dt] = [];
        byDate[dt].push(d);
      });
      const dailyProds = Object.values(byDate).map(dayData => {
        const dayIncProd = new Set(dayData.filter((dd: any) => !dd.Improdutivo).map((dd: any) => dd.Número)).size;
        const dayTeams = new Set<string>();
        dayData.forEach((dd: any) => {
          const eq = String(dd["Equipe Desl."] || "");
          if (!eq || eq === "Não informado") return;
          eq.split(/[/;+]| e /).map((t: string) => t.trim()).filter((t: string) => t.length > 0 && t !== "---").forEach((t: string) => dayTeams.add(t));
        });
        return dayTeams.size > 0 ? dayIncProd / dayTeams.size : 0;
      });
      prodValue = dailyProds.length > 0 ? dailyProds.reduce((a, b) => a + b, 0) / dailyProds.length : 0;
    } else {
      prodValue = equipesCount > 0 ? incProdutivos / equipesCount : 0;
    }

    return { Processos: proc, Incidentes: inc, Equipes: equipesCount, Improdutivos: imp, Reinc: reinc, Prod: prodValue };
  });

  // Total row
  const totalEquipes = new Set<string>();
  data.forEach((d) => {
    const equipeStr = String(d["Equipe Desl."] || "");
    if (!equipeStr || equipeStr === "Não informado") return;
    equipeStr.split(/[/;+]| e /).map((t) => t.trim()).filter((t) => t.length > 0 && t !== "---").forEach((t) => totalEquipes.add(t));
  });
  const totalIncProdutivos = new Set(data.filter((d) => !d.Improdutivo).map((d) => d.Número)).size;

  // Ranking
  const rankingEquipes = useMemo(() => {
    const baseRanking: TeamRankingData[] = equipesPresentes.map((eq) => {
      const eqData = data.filter((d) => d["Equipe Desl."] === eq);
      const dias = new Set(
        eqData.map((d: any) => d["Data Turno"] || d["Data Ação"]).filter(Boolean)
      ).size || 1;
      const inc = new Set(eqData.map((d) => d.Número)).size;
      const imp = eqData.filter((d) => d.Improdutivo).length;
      const reinc = eqData.filter(isReincidenteCausadoRow).length;
      const tmde = eqData.length > 0 ? eqData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) / eqData.length : 0;
      const ord2 = eqData.filter((d) => d.ordem2).length;
      const ocupacao = calculateOccupancy(eqData);
      const idleMinutes = calculateIdleMinutes(eqData);

      let maxLoginVal: number | null = null;
      eqData.forEach((d) => {
        const val = getValMinutes(d["1º Login Corrigido"]);
        if (val != null && (maxLoginVal === null || val > maxLoginVal)) maxLoginVal = val;
      });

      let maxDespachoVal: number | null = null;
      eqData.forEach((d) => {
        const val = getValMinutes(d["1º Despacho"]);
        if (val != null && (maxDespachoVal === null || val > maxDespachoVal)) maxDespachoVal = val;
      });

      const platVal = calcTempoPlataforma(eqData);
      const retVal = calcRetornoBase(eqData);

      return {
        Equipe: eq,
        Incidentes: inc,
        Improdutivos: imp,
        "Reincidentes causados": reinc,
        TMDE: tmde,
        "Ordem 2": ord2,
        Ocupação: ocupacao,
        Dias: dias,
        "Ociosidade (min)": idleMinutes,
        "Inc. Ociosid.": Math.floor(idleMinutes / 60),
        Login: maxLoginVal != null ? maxLoginVal.toFixed(1) : "-",
        Despacho: maxDespachoVal != null ? maxDespachoVal.toFixed(1) : "-",
        "Tempo de plataforma": platVal != null ? platVal.toFixed(1) : "-",
        "Retorno Base": retVal != null ? retVal.toFixed(1) : "-",
      };
    });

    const scored = calculateRankingScores(baseRanking, weights);

    scored.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];
      if (typeof aValue === "string") aValue = aValue === "-" ? -1 : Number(aValue);
      if (typeof bValue === "string") bValue = bValue === "-" ? -1 : Number(bValue);
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return scored;
  }, [data, weights, sortConfig, calculateOccupancy, calculateIdleMinutes, calcTempoPlataforma, calcRetornoBase, getValMinutes]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Polo Header with 8 KPIs */}
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <h2 className="text-lg font-bold text-foreground mb-2">{polo}</h2>
        <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-warning" />
            <span className="font-medium text-foreground">{totalInc}</span> inc.
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3 text-primary" />
            TMDE <span className="font-medium text-foreground">{tmdeMedio.toFixed(1)}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <BarChart3 className="h-3 w-3 text-accent" />
            Reinc. <span className="font-medium text-foreground">{(taxaReinc * 100).toFixed(1)}%</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-3 w-3 text-destructive" />
            Improd. <span className="font-medium text-foreground">{(taxaImprod * 100).toFixed(1)}%</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <LogIn className="h-3 w-3 text-success" />
            Login <span className="font-medium text-foreground">{avgLogin != null ? avgLogin.toFixed(1) : "-"}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Navigation className="h-3 w-3 text-primary" />
            Desp. <span className="font-medium text-foreground">{avgDespacho != null ? avgDespacho.toFixed(1) : "-"}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Timer className="h-3 w-3 text-success" />
            T.Plat. <span className="font-medium text-foreground">{avgPlat != null ? avgPlat.toFixed(1) : "-"}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <RotateCcw className="h-3 w-3 text-destructive" />
            Ret.Base <span className="font-medium text-foreground">{avgRet != null ? avgRet.toFixed(1) : "-"}</span>
          </span>
        </div>
      </div>

      {/* Resultado por Processo - compact */}
      <div className="overflow-x-auto border-b border-border">
        <table className="w-full divide-y divide-border text-[11px]">
          <thead className="bg-secondary/20">
            <tr>
              {["Processo", "Inc.", "Eq.", "Improd.", "Reinc.", "Prod."].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {resumoProcessos.filter((r) => r.Incidentes > 0).map((row) => (
              <tr key={row.Processos}>
                <td className="px-2 py-1 text-foreground">{row.Processos}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Incidentes}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Equipes}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Improdutivos}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Reinc}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Prod.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-secondary/20 font-semibold">
              <td className="px-2 py-1 text-foreground">Total</td>
              <td className="px-2 py-1 text-muted-foreground">{totalInc}</td>
              <td className="px-2 py-1 text-muted-foreground">{totalEquipes.size}</td>
              <td className="px-2 py-1 text-muted-foreground">{resumoProcessos.reduce((a, r) => a + r.Improdutivos, 0)}</td>
              <td className="px-2 py-1 text-muted-foreground">{resumoProcessos.reduce((a, r) => a + r.Reinc, 0)}</td>
              <td className="px-2 py-1 text-muted-foreground">
                {(() => {
                  if (!isPeriodMode) return totalEquipes.size > 0 ? (totalIncProdutivos / totalEquipes.size).toFixed(2) : "0";
                  const byDate: Record<string, any[]> = {};
                  data.forEach(d => {
                    const dt = d["Data Turno"] || d["Data Ação"] || "unknown";
                    if (!byDate[dt]) byDate[dt] = [];
                    byDate[dt].push(d);
                  });
                  const dailyProds = Object.values(byDate).map(dayData => {
                    const dayIncProd = new Set(dayData.filter((dd: any) => !dd.Improdutivo).map((dd: any) => dd.Número)).size;
                    const dayTeams = new Set<string>();
                    dayData.forEach((dd: any) => {
                      const eq = String(dd["Equipe Desl."] || "");
                      if (!eq || eq === "Não informado") return;
                      eq.split(/[/;+]| e /).map((t: string) => t.trim()).filter((t: string) => t.length > 0 && t !== "---").forEach((t: string) => dayTeams.add(t));
                    });
                    return dayTeams.size > 0 ? dayIncProd / dayTeams.size : 0;
                  });
                  return dailyProds.length > 0 ? (dailyProds.reduce((a, b) => a + b, 0) / dailyProds.length).toFixed(2) : "0";
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Ranking */}
      <div className="px-3 py-2 border-b border-border bg-secondary/20 flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Ranking ({rankingEquipes.length} equipes)</span>
      </div>
      <div className="overflow-x-auto max-h-64">
        <table className="w-full divide-y divide-border text-[11px]">
          <thead className="bg-secondary/20 sticky top-0">
            <tr>
              {[
                { label: "Pos", key: "pontuacao" },
                { label: "Equipe", key: "Equipe" },
                { label: "Pts", key: "pontuacao" },
                { label: "Inc.", key: "Incidentes" },
                { label: "Ocup.", key: "Ocupação" },
                { label: "Ociosid.", key: "Ociosidade (min)" },
              ].map((col) => (
                <th
                  key={col.label}
                  onClick={() => handleSort(col.key)}
                  className="px-2 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-background select-none"
                >
                  <div className="flex items-center gap-0.5">
                    <span>{col.label}</span>
                    {sortConfig.key === col.key && (
                      <span className="text-muted-foreground/70">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rankingEquipes.map((row, idx) => (
              <tr
                key={row.Equipe}
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => onTeamClick(row)}
              >
                <td className="px-2 py-1 text-muted-foreground font-mono">
                  {idx + 1}
                </td>
                <td className="px-2 py-1 text-foreground font-medium truncate max-w-[120px]">
                  {row.Equipe}
                  {row.hasIncompleteData && <span className="text-warning ml-0.5">*</span>}
                </td>
                <td className="px-2 py-1 font-bold text-primary">{row.pontuacao}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Incidentes}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.Ocupação.toFixed(1)}%</td>
                <td className="px-2 py-1 text-muted-foreground">{row["Ociosidade (min)"].toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
