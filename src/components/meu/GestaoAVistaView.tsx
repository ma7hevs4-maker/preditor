import React, { useState, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Eye,
  Printer,
  Check,
  BarChart3,
  Timer,
  RotateCcw,
  AlertTriangle,
  XCircle,
  Activity,
  Clock,
  LogIn,
  SlidersHorizontal,
  Filter,
  Calendar,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UTS_POLOS, UTN_POLOS } from "@/utils/rankingScoring";

const FilterMultiSelect = ({ label, options, selected, onChange, searchable }: any) => {
  const [search, setSearch] = useState("");
  const filteredOptions = searchable 
    ? options.filter((opt: string) => opt.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {label}
          {selected.length > 0 && (
            <span className="ml-1.5 text-primary font-mono">({selected.length})</span>
          )}
        </label>
        <div className="flex gap-2">
          <button onClick={() => onChange(filteredOptions)} className="text-[10px] text-primary hover:underline">Todos</button>
          <button onClick={() => onChange([])} className="text-[10px] text-muted-foreground hover:underline">Limpar</button>
        </div>
      </div>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md bg-background text-foreground border border-border text-xs p-1.5 pl-7 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
        {filteredOptions.map((opt: string) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => {
                if (isSelected) {
                  onChange(selected.filter((s: string) => s !== opt));
                } else {
                  onChange([...selected, opt]);
                }
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] border transition-colors ${
                isSelected
                  ? "bg-primary/15 border-primary/40 text-foreground font-medium"
                  : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface FilterState {
  isPeriodMode: boolean;
  setIsPeriodMode: (v: boolean) => void;
  selectedData: string;
  setSelectedData: (v: string) => void;
  periodStart: string;
  setPeriodStart: (v: string) => void;
  periodEnd: string;
  setPeriodEnd: (v: string) => void;
  selectedPolos: string[];
  setSelectedPolos: (v: string[]) => void;
  selectedProcessos: string[];
  setSelectedProcessos: (v: string[]) => void;
  selectedTiposEquipe: string[];
  setSelectedTiposEquipe: (v: string[]) => void;
  selectedTurnos: string[];
  setSelectedTurnos: (v: string[]) => void;
  selectedEquipes: string[];
  setSelectedEquipes: (v: string[]) => void;
  selectedIncidents: string[];
  setSelectedIncidents: (v: string[]) => void;
  tmdeAbove150Filter: string;
  setTmdeAbove150Filter: (v: string) => void;
  o2AnomaliaFilter: string;
  setO2AnomaliaFilter: (v: string) => void;
  datas: string[];
  polos: string[];
  processos: string[];
  tiposEquipe: string[];
  turnos: string[];
  equipes: string[];
  incidents: string[];
  activeFilterCount: number;
}

interface GestaoAVistaViewProps {
  filteredData: any[];
  onBack: () => void;
  isPeriodMode: boolean;
  numDays: number;
  calculateOccupancy: (eqData: any[]) => number;
  calculateIdleMinutes: (eqData: any[]) => number;
  calcTempoPlataforma: (eqData: any[]) => number | null;
  calcRetornoBase: (eqData: any[]) => number | null;
  getValMinutes: (val: any) => number | null;
  filterState: FilterState;
}

type RankingType =
  | "producao"
  | "login"
  | "plataforma"
  | "retorno"
  | "reincidentes"
  | "improdutivos"
  | "ocupacao"
  | "ociosidade";

interface RankingConfig {
  key: RankingType;
  label: string;
  icon: React.ReactNode;
  sortField: string;
  direction: "asc" | "desc";
  format: (val: number) => string;
  kpiLabel: string;
  kpiAggregation: "sum" | "avg";
  meta?: number;
  metaPerTeam?: number;
  metaLabel?: string;
  metaDirection?: "higher" | "lower";
}

const RANKING_CONFIGS: RankingConfig[] = [
  {
    key: "producao",
    label: "Produção (Incidentes)",
    icon: <BarChart3 className="h-4 w-4" />,
    sortField: "incidentes",
    direction: "desc",
    format: (v) => String(v),
    kpiLabel: "Total de Incidentes",
    kpiAggregation: "sum",
    metaPerTeam: 4.4,
    metaLabel: "≥ 4,4 inc/dia",
    metaDirection: "higher",
  },
  {
    key: "login",
    label: "Login (min)",
    icon: <LogIn className="h-4 w-4" />,
    sortField: "login",
    direction: "asc",
    format: (v) => v.toFixed(1),
    kpiLabel: "Média Login",
    kpiAggregation: "avg",
    meta: 8,
    metaLabel: "≤ 8 min",
    metaDirection: "lower",
  },
  {
    key: "plataforma",
    label: "Tempo de Plataforma (min)",
    icon: <Timer className="h-4 w-4" />,
    sortField: "plataforma",
    direction: "asc",
    format: (v) => v.toFixed(1),
    kpiLabel: "Média T. Plataforma",
    kpiAggregation: "avg",
    meta: 25,
    metaLabel: "≤ 25 min",
    metaDirection: "lower",
  },
  {
    key: "retorno",
    label: "Retorno à Base (min)",
    icon: <RotateCcw className="h-4 w-4" />,
    sortField: "retorno",
    direction: "asc",
    format: (v) => v.toFixed(1),
    kpiLabel: "Média Retorno Base",
    kpiAggregation: "avg",
    meta: 40,
    metaLabel: "≤ 40 min",
    metaDirection: "lower",
  },
  {
    key: "reincidentes",
    label: "Reincidentes Causados",
    icon: <AlertTriangle className="h-4 w-4" />,
    sortField: "reincidentes",
    direction: "asc",
    format: (v) => String(v),
    kpiLabel: "Total Reincidentes",
    kpiAggregation: "sum",
    metaDirection: "lower",
  },
  {
    key: "improdutivos",
    label: "Improdutivos",
    icon: <XCircle className="h-4 w-4" />,
    sortField: "improdutivos",
    direction: "asc",
    format: (v) => String(v),
    kpiLabel: "Total Improdutivos",
    kpiAggregation: "sum",
    metaDirection: "lower",
  },
  {
    key: "ocupacao",
    label: "Ocupação (%)",
    icon: <Activity className="h-4 w-4" />,
    sortField: "ocupacao",
    direction: "desc",
    format: (v) => v.toFixed(1) + "%",
    kpiLabel: "Média Ocupação",
    kpiAggregation: "avg",
    meta: 85,
    metaLabel: "≥ 85%",
    metaDirection: "higher",
  },
  {
    key: "ociosidade",
    label: "Tempo Ocioso (min)",
    icon: <Clock className="h-4 w-4" />,
    sortField: "ociosidade",
    direction: "asc",
    format: (v) => v.toFixed(0),
    kpiLabel: "Média Ociosidade",
    kpiAggregation: "avg",
    metaDirection: "lower",
  },
];

function matchPoloName(rawPolo: string): string | null {
  if (!rawPolo || rawPolo === "Não informado") return null;
  const allPolos = [...UTS_POLOS, ...UTN_POLOS];
  if (allPolos.includes(rawPolo)) return rawPolo;
  const normalized = rawPolo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const polo of allPolos) {
    const poloNorm = polo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(poloNorm) || poloNorm.includes(normalized)) return polo;
  }
  return rawPolo;
}

interface TeamData {
  equipe: string;
  incidentes: number;
  improdutivos: number;
  reincidentes: number;
  ocupacao: number;
  ociosidade: number;
  login: number | null;
  plataforma: number | null;
  retorno: number | null;
}

/**
 * Get a raw M300 value for a team, deduplicated (take the single unique value per team/day).
 * M300 columns repeat per incident row but the value is the same for the whole team/day.
 */
function getRawM300Value(eqData: any[], columnName: string, getValMinutes: (val: any) => number | null): number | null {
  // Get distinct non-null values
  const seen = new Set<number>();
  for (const d of eqData) {
    const raw = d[columnName];
    const val = getValMinutes(raw);
    if (val != null && val > 0) {
      seen.add(val);
    }
  }
  if (seen.size === 0) return null;
  // If multiple distinct values (e.g. period mode with multiple days), average them
  const values = Array.from(seen);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function GestaoAVistaView({
  filteredData,
  onBack,
  isPeriodMode,
  numDays,
  calculateOccupancy,
  calculateIdleMinutes,
  calcTempoPlataforma,
  calcRetornoBase,
  getValMinutes,
  filterState,
}: GestaoAVistaViewProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const allPolos = useMemo(() => {
    const poloSet = new Set<string>();
    filteredData.forEach((d) => {
      const polo = matchPoloName(d.Polo);
      if (polo) poloSet.add(polo);
    });
    return Array.from(poloSet).sort();
  }, [filteredData]);

  const [selectedPolo, setSelectedPolo] = useState<string>(allPolos[0] || "");
  const [selectedRankings, setSelectedRankings] = useState<Set<RankingType>>(
    new Set(RANKING_CONFIGS.map((c) => c.key))
  );
  const printRef = useRef<HTMLDivElement>(null);

  const poloData = useMemo(() => {
    return filteredData.filter((d) => {
      const polo = matchPoloName(d.Polo);
      return polo === selectedPolo;
    });
  }, [filteredData, selectedPolo]);

  const teamsData: TeamData[] = useMemo(() => {
    const equipesPresentes = Array.from(
      new Set(poloData.map((d) => d["Equipe Desl."]).filter(Boolean))
    ).filter((eq) => eq !== "Não informado" && eq !== "---");

    return equipesPresentes.map((eq) => {
      const eqData = poloData.filter((d) => d["Equipe Desl."] === eq);
      const inc = new Set(eqData.map((d) => d.Número)).size;
      const imp = eqData.filter((d) => d.Improdutivo).length;
      const reinc = eqData.filter((d) => d["Reincidente Causado"]).length;
      const ocupacao = calculateOccupancy(eqData);
      const ociosidade = calculateIdleMinutes(eqData);

      // Raw M300 values (deduplicated)
      const login = getRawM300Value(eqData, "1º Login Corrigido", getValMinutes);
      const plataforma = getRawM300Value(eqData, "1º Desloc", getValMinutes);
      const retorno = getRawM300Value(eqData, "Retorno a base", getValMinutes);

      return {
        equipe: eq,
        incidentes: inc,
        improdutivos: imp,
        reincidentes: reinc,
        ocupacao,
        ociosidade,
        login,
        plataforma,
        retorno,
      };
    });
  }, [poloData, calculateOccupancy, calculateIdleMinutes, getValMinutes]);

  const toggleRanking = (key: RankingType) => {
    setSelectedRankings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getTeamValue = (team: TeamData, field: string): number => {
    switch (field) {
      case "incidentes": return team.incidentes;
      case "improdutivos": return team.improdutivos;
      case "reincidentes": return team.reincidentes;
      case "ocupacao": return team.ocupacao;
      case "ociosidade": return team.ociosidade;
      case "login": return team.login ?? 999;
      case "plataforma": return team.plataforma ?? 999;
      case "retorno": return team.retorno ?? 999;
      default: return 0;
    }
  };

  const getKpiValue = (config: RankingConfig): number => {
    const values = teamsData.map((t) => getTeamValue(t, config.sortField)).filter((v) => v !== 999);
    if (values.length === 0) return 0;
    if (config.kpiAggregation === "sum") return values.reduce((a, b) => a + b, 0);
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gestão à Vista - ${selectedPolo}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; }
          .ranking-page { page-break-after: always; padding: 8mm 0; }
          .ranking-page:last-child { page-break-after: auto; }
          .ranking-header { text-align: center; margin-bottom: 6mm; border-bottom: 3px solid #1a1a2e; padding-bottom: 4mm; }
          .ranking-header h1 { font-size: 22pt; font-weight: 800; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; }
          .ranking-header .polo { font-size: 14pt; color: #4a4a6a; font-weight: 600; margin-top: 2mm; }
          .kpi-bar { display: flex; justify-content: center; gap: 12mm; margin-bottom: 6mm; padding: 4mm 0; background: #f0f0f8; border-radius: 3mm; }
          .kpi-item { text-align: center; }
          .kpi-item .value { font-size: 20pt; font-weight: 800; color: #1a1a2e; }
          .kpi-item .label { font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1mm; }
          .kpi-item .meta { font-size: 8pt; color: #888; margin-top: 0.5mm; }
          .kpi-item .meta.good { color: #16a34a; }
          .kpi-item .meta.bad { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          thead th { background: #1a1a2e; color: #fff; padding: 3mm 4mm; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9pt; }
          thead th:first-child { width: 10%; text-align: center; }
          thead th:nth-child(2) { width: 55%; }
          thead th:last-child { width: 35%; text-align: right; }
          tbody tr { border-bottom: 1px solid #e0e0e0; }
          tbody tr:nth-child(even) { background: #f8f8fc; }
          tbody tr:nth-child(1) td { font-weight: 700; }
          tbody tr:nth-child(1) td:first-child { color: #d4a017; font-size: 14pt; }
          tbody tr:nth-child(2) td:first-child { color: #888; font-size: 12pt; }
          tbody tr:nth-child(3) td:first-child { color: #b87333; font-size: 12pt; }
          tbody td { padding: 2.5mm 4mm; }
          tbody td:first-child { text-align: center; font-weight: 700; font-size: 11pt; color: #555; }
          tbody td:last-child { text-align: right; font-weight: 600; font-family: 'Consolas', monospace; font-size: 11pt; }
          .footer { text-align: center; font-size: 7pt; color: #999; margin-top: 4mm; border-top: 1px solid #ddd; padding-top: 2mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
    `);

    const activeRankings = RANKING_CONFIGS.filter((c) => selectedRankings.has(c.key));

    activeRankings.forEach((config) => {
      const sorted = [...teamsData]
        .filter((t) => getTeamValue(t, config.sortField) !== 999)
        .sort((a, b) => {
          const va = getTeamValue(a, config.sortField);
          const vb = getTeamValue(b, config.sortField);
          return config.direction === "asc" ? va - vb : vb - va;
        });

      const kpiValue = getKpiValue(config);
      const kpiFormatted = config.format(kpiValue);
      const metaValue = config.meta ?? config.metaPerTeam;
      let metaClass = "";
      if (metaValue != null) {
        const compareValue = config.metaPerTeam != null ? kpiValue / (sorted.length || 1) : kpiValue;
        const isGood = config.metaDirection === "lower" ? compareValue <= metaValue : compareValue >= metaValue;
        metaClass = isGood ? "good" : "bad";
      }

      printWindow.document.write(`
        <div class="ranking-page">
          <div class="ranking-header">
            <h1>${config.label}</h1>
            <div class="polo">${selectedPolo}</div>
          </div>
          <div class="kpi-bar">
            <div class="kpi-item">
              <div class="value">${kpiFormatted}</div>
              <div class="label">${config.kpiLabel}</div>
              ${metaValue != null ? `<div class="meta ${metaClass}">Meta: ${config.metaLabel}</div>` : ""}
            </div>
            <div class="kpi-item">
              <div class="value">${sorted.length}</div>
              <div class="label">Equipes</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Equipe</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${sorted
                .map(
                  (team, idx) => `
                <tr>
                  <td>${idx + 1}º</td>
                  <td>${team.equipe}</td>
                  <td>${config.format(getTeamValue(team, config.sortField))}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="footer">Gestão à Vista • ${selectedPolo} • Gerado em ${new Date().toLocaleString("pt-BR")}</div>
        </div>
      `);
    });

    printWindow.document.write("</body></html>");
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const fs = filterState;

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 sm:px-6 py-3 flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Gestão à Vista
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPolo} onValueChange={setSelectedPolo}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Selecione o Polo" />
            </SelectTrigger>
            <SelectContent>
              {allPolos.map((polo) => (
                <SelectItem key={polo} value={polo}>
                  {polo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePrint} disabled={selectedRankings.size === 0}>
            <Printer className="h-3.5 w-3.5" />
            Imprimir ({selectedRankings.size})
          </Button>

          {/* Filter badges */}
          {fs.activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] font-mono gap-1">
              <Filter className="h-3 w-3" />
              {fs.activeFilterCount} filtro{fs.activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}

          {/* Filter Sheet */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {fs.activeFilterCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                    {fs.activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 sm:w-96 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border bg-secondary/30">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtros
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-5">
                  {/* Modo de Análise */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Modo de Análise
                      </label>
                      <button
                        onClick={() => fs.setIsPeriodMode(!fs.isPeriodMode)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${fs.isPeriodMode ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${fs.isPeriodMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Data / Período */}
                  {!fs.isPeriodMode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Dia
                      </label>
                      <select
                        value={fs.selectedData}
                        onChange={(e) => fs.setSelectedData(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="">Todos</option>
                        {fs.datas.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {fs.isPeriodMode && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Período
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">De</span>
                          <select
                            value={fs.periodStart}
                            onChange={(e) => fs.setPeriodStart(e.target.value)}
                            className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                          >
                            {fs.datas.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Até</span>
                          <select
                            value={fs.periodEnd}
                            onChange={(e) => fs.setPeriodEnd(e.target.value)}
                            className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                          >
                            {fs.datas.filter(d => d >= fs.periodStart).map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Filters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">TMDE &gt; 150</label>
                      <select
                        value={fs.tmdeAbove150Filter}
                        onChange={(e) => fs.setTmdeAbove150Filter(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="todos">Todos</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">O2 / Anomalia</label>
                      <select
                        value={fs.o2AnomaliaFilter}
                        onChange={(e) => fs.setO2AnomaliaFilter(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="todos">Todos</option>
                        <option value="o2">Possível O2</option>
                        <option value="anomalia">Possível Anomalia</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <FilterMultiSelect label="Polo" options={fs.polos} selected={fs.selectedPolos} onChange={fs.setSelectedPolos} />
                    <FilterMultiSelect label="Processo" options={fs.processos} selected={fs.selectedProcessos} onChange={fs.setSelectedProcessos} />
                    <FilterMultiSelect label="Insourcing / Outsourcing" options={fs.tiposEquipe} selected={fs.selectedTiposEquipe} onChange={fs.setSelectedTiposEquipe} />
                    <FilterMultiSelect label="Turno" options={fs.turnos} selected={fs.selectedTurnos} onChange={fs.setSelectedTurnos} />
                    <FilterMultiSelect label="Equipe" options={fs.equipes} selected={fs.selectedEquipes} onChange={fs.setSelectedEquipes} searchable={true} />
                    <FilterMultiSelect label="Incidente" options={fs.incidents} selected={fs.selectedIncidents} onChange={fs.setSelectedIncidents} searchable={true} />
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Ranking selection */}
        <div className="mb-6 p-4 bg-card rounded-xl border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-3">Selecione os rankings para impressão:</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {RANKING_CONFIGS.map((config) => (
              <label
                key={config.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs ${
                  selectedRankings.has(config.key)
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <Checkbox
                  checked={selectedRankings.has(config.key)}
                  onCheckedChange={() => toggleRanking(config.key)}
                  className="h-3.5 w-3.5"
                />
                <span className="flex items-center gap-1.5">
                  {config.icon}
                  {config.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div ref={printRef} className="space-y-6">
          {RANKING_CONFIGS.filter((c) => selectedRankings.has(c.key)).map((config) => {
            const sorted = [...teamsData]
              .filter((t) => getTeamValue(t, config.sortField) !== 999)
              .sort((a, b) => {
                const va = getTeamValue(a, config.sortField);
                const vb = getTeamValue(b, config.sortField);
                return config.direction === "asc" ? va - vb : vb - va;
              });

            const kpiValue = getKpiValue(config);
            let metaStatus: "good" | "bad" | "neutral" = "neutral";
            if (config.meta != null) {
              metaStatus = config.metaDirection === "lower"
                ? kpiValue <= config.meta ? "good" : "bad"
                : kpiValue >= config.meta ? "good" : "bad";
            }

            return (
              <div key={config.key} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Ranking Title + KPIs */}
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{sorted.length} equipes</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-2xl font-bold text-foreground">{config.format(kpiValue)}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{config.kpiLabel}</span>
                    </div>
                    {config.meta != null && (
                      <div className={`text-xs font-medium ${metaStatus === "good" ? "text-green-600" : "text-red-500"}`}>
                        Meta: {config.metaLabel}
                        {metaStatus === "good" ? (
                          <Check className="inline h-3 w-3 ml-1" />
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/20 border-b border-border">
                        <th className="px-3 py-2 text-center font-semibold text-muted-foreground w-12">Pos.</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Equipe</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground w-24">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sorted.map((team, idx) => (
                        <tr
                          key={team.equipe}
                          className={`${idx < 3 ? "font-semibold" : ""} ${idx === 0 ? "bg-yellow-500/5" : ""}`}
                        >
                          <td className="px-3 py-1.5 text-center text-muted-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                          </td>
                          <td className="px-3 py-1.5 text-foreground">{team.equipe}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-foreground">
                            {config.format(getTeamValue(team, config.sortField))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {teamsData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sem dados para o polo selecionado no período atual.</p>
          </div>
        )}
      </div>
    </div>
  );
}
