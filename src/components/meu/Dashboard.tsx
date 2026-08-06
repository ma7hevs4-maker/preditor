import React, { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  AlertTriangle,
  XCircle,
  X,
  SlidersHorizontal,
  Filter,
  Calendar,
  Search,
  LogIn,
  Navigation,
  Timer,
  RotateCcw,
  Save,
  Loader2,
  Trophy,
  Star,
  Eye,
  Table2,
  LineChart,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TimelineChart } from "./TimelineChart";
import { getShiftStartHour, horaParaDecimalSeguro } from "../../utils/meuDataProcessing";
import { useSavedDashboard } from "@/hooks/useSavedDashboard";
import { toast } from "sonner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { calculateRankingScores, parseWeightsFromSettings, TeamRankingData } from "@/utils/rankingScoring";
import { PoloAnalysisView } from "./PoloAnalysisView";
import { TeamDetailModal } from "./TeamDetailModal";
import { GestaoAVistaView } from "./GestaoAVistaView";
import { M300SummaryDialog } from "./M300SummaryDialog";
import { EvolucaoTemporalView } from "./EvolucaoTemporalView";
import { getInsourcingTypeFromEquipe, isReincidenteCausadoRow } from "@/utils/meuDataProcessing";
import { classifyTeamOrigin } from "@/data/teamPrefixToPolo";

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
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                isSelected
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50'
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

interface DashboardProps {
  data: any[];
  onBack: () => void;
  sourceFiles?: { incFileName?: string; m300FileName?: string };
  rawInc?: any[];
  rawM300?: any[];
}

export function Dashboard({ data: rawData, onBack, sourceFiles, rawInc, rawM300 }: DashboardProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { saveRawData, isSaving, saveProgress } = useSavedDashboard();
  const { data: systemSettings } = useSystemSettings();
  const rankingWeights = useMemo(() => parseWeightsFromSettings(systemSettings), [systemSettings]);
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingAction, setPendingAction] = useState<"save" | null>(null);
  const [showPoloAnalysis, setShowPoloAnalysis] = useState(false);
  const [showGestaoAVista, setShowGestaoAVista] = useState(false);
  const [teamDetailModal, setTeamDetailModal] = useState<any>(null);
  const [showM300Summary, setShowM300Summary] = useState(false);
  const [showEvolucaoTemporal, setShowEvolucaoTemporal] = useState(false);
  const isInvalidData = !rawData || !Array.isArray(rawData);
  const data = Array.isArray(rawData) ? rawData : [];

  // Extract unique values for filters
  const datas = useMemo(() => {
    const allDates = new Set<string>();
    data.forEach(d => {
      if (d["Data Turno"]) allDates.add(d["Data Turno"]);
      else if (d["Data Ação"]) allDates.add(d["Data Ação"]);
    });
    return Array.from(allDates).sort();
  }, [data]);
  const polos = useMemo(
    () => Array.from(new Set(data.map((d) => d.Polo).filter(Boolean))).sort(),
    [data],
  );
  const processos = useMemo(
    () =>
      Array.from(new Set(data.map((d) => d.Processo).filter(Boolean))).sort(),
    [data],
  );
  const tiposEquipe = useMemo(
    () =>
      Array.from(
        new Set(data.map((d) => getInsourcingTypeFromEquipe(d)).filter(Boolean)),
      ).sort(),
    [data],
  );
  const turnos = useMemo(() => {
    const allTurnos = Array.from(new Set(data.map((d) => d.Turno).filter(Boolean))).sort();
    return allTurnos;
  }, [data]);
  const equipes = useMemo(
    () =>
      Array.from(
        new Set(data.map((d) => d["Equipe Desl."]).filter(Boolean)),
      ).sort(),
    [data],
  );
  const incidents = useMemo(
    () =>
      Array.from(
        new Set(data.map((d) => d.Número).filter(Boolean)),
      ).sort(),
    [data],
  );

  // Filter states
  const [isPeriodMode, setIsPeriodMode] = useState<boolean>(false);
  const [selectedData, setSelectedData] = useState<string>(() => {
    // Default to D-1 (second-to-last date) if available
    if (datas.length >= 2) return datas[datas.length - 2];
    return datas[datas.length - 1] || "";
  });
  // Period mode: date range
  const [periodStart, setPeriodStart] = useState<string>(() => {
    if (datas.length >= 7) return datas[datas.length - 7];
    return datas[0] || "";
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    return datas[datas.length - 1] || "";
  });
  const [selectedPolos, setSelectedPolos] = useState<string[]>([]);
  const [selectedProcessos, setSelectedProcessos] = useState<string[]>([]);
  const [selectedTiposEquipe, setSelectedTiposEquipe] = useState<string[]>([]);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [selectedEquipes, setSelectedEquipes] = useState<string[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [tmdeAbove150Filter, setTmdeAbove150Filter] = useState<string>("todos");
  const [o2AnomaliaFilter, setO2AnomaliaFilter] = useState<string>("todos");
  const [retornoBase40Filter, setRetornoBase40Filter] = useState<string>("todos");
  const [teamOriginFilter, setTeamOriginFilter] = useState<string>("todos");
  const [improdutivoFilter, setImprodutivoFilter] = useState<string>("todos");

  const normalizeIncidentNumber = (value: any) => {
    const s = String(value ?? "").trim();
    return /^\d+$/.test(s) ? s.replace(/^0+/, "") : s;
  };

  const countUniqueReincidentes = (rows: any[]) =>
    new Set(
      rows
        .filter(isReincidenteCausadoRow)
        .map((d) => normalizeIncidentNumber(d.Número))
        .filter(Boolean),
    ).size;

  const matchesSelectedDateFilter = (rowDateStr?: string | null) => {
    if (!rowDateStr) return false;

    if (!isPeriodMode) {
      return !selectedData || rowDateStr === selectedData;
    }

    if (!periodStart || !periodEnd) return true;
    return rowDateStr >= periodStart && rowDateStr <= periodEnd;
  };

  // Apply filters
  const dataFilteredByBasics = useMemo(() => {
    return data.filter((d) => {
      if (d.isM300Only) return false;
      if (d["Equipe Desl."] === "---") return false;
      
      const rowDateStr = d["Data Turno"] || d["Data Ação"];
      if (!matchesSelectedDateFilter(rowDateStr)) return false;

      if (selectedPolos.length > 0 && !selectedPolos.includes(d.Polo))
        return false;
      if (teamOriginFilter !== "todos") {
        const kind = classifyTeamOrigin(d["Equipe Desl."], d.Polo);
        if (kind !== teamOriginFilter) return false;
      }
      if (
        selectedProcessos.length > 0 &&
        !selectedProcessos.includes(d.Processo)
      )
        return false;
      if (
        selectedTiposEquipe.length > 0 &&
        !selectedTiposEquipe.includes(getInsourcingTypeFromEquipe(d))
      )
        return false;
      if (selectedTurnos.length > 0) {
        const equipe = String(d["Equipe Desl."] || "");
        const firstEquipe = equipe.split(/[/;+]| e /)[0].trim();
        const parts = firstEquipe.split("-");
        let rowTurno = "Outros";
        if (parts.length >= 2) {
          const letter = parts[1].charAt(0).toUpperCase();
          if (["A", "B", "C"].includes(letter)) rowTurno = letter;
        }
        if (!selectedTurnos.includes(rowTurno)) return false;
      }
      if (
        selectedEquipes.length > 0 &&
        !selectedEquipes.includes(d["Equipe Desl."])
      )
        return false;
      if (
        selectedIncidents.length > 0 &&
        !selectedIncidents.includes(d.Número)
      )
        return false;
      if (improdutivoFilter === "nao" && d.Improdutivo) return false;
      return true;
    });
  }, [
    data,
    selectedData,
    isPeriodMode,
    periodStart,
    periodEnd,
    selectedPolos,
    teamOriginFilter,
    selectedProcessos,
    selectedTiposEquipe,
    selectedTurnos,
    selectedEquipes,
    selectedIncidents,
    improdutivoFilter,
  ]);

  const teamsWithAbove150 = useMemo(() => {
    const teams = new Set<string>();
    dataFilteredByBasics.forEach(d => {
      if ((Number(d.TMDE) || 0) > 150) {
        teams.add(d["Equipe Desl."]);
      }
    });
    return teams;
  }, [dataFilteredByBasics]);

  const filteredDataPreRetorno = useMemo(() => {
    let result = dataFilteredByBasics;
    
    if (tmdeAbove150Filter !== "todos") {
      result = result.filter(d => {
        const hasAbove150 = teamsWithAbove150.has(d["Equipe Desl."]);
        return tmdeAbove150Filter === "sim" ? hasAbove150 : !hasAbove150;
      });
    }

    if (o2AnomaliaFilter !== "todos") {
      result = result.filter(d => {
        if (o2AnomaliaFilter === "o2") return d.possivelO2;
        if (o2AnomaliaFilter === "anomalia") return d.possivelAnomalia;
        return true;
      });
    }
    
    return result;
  }, [dataFilteredByBasics, tmdeAbove150Filter, o2AnomaliaFilter, teamsWithAbove150]);

  // Helper to convert various formats to minutes
  const getValMinutes = (val: any): number | null => {
    if (val == null || val === "" || val === "-") return null;
    
    if (typeof val === "number") {
      if (val > 10000) return (val - Math.floor(val)) * 1440;
      if (val > 0 && val < 1) return val * 1440;
      return val;
    }
    
    if (val instanceof Date) {
      return val.getUTCHours() * 60 + val.getUTCMinutes();
    }
    
    if (typeof val === "string") {
      const parts = val.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
      }
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  // Helper to convert various formats to decimal hours
  const convertToDecimalHours = (val: any, baseDateStr?: string): number | undefined => {
    if (val == null || val === "" || val === "-") return undefined;
    
    let date: Date | null = null;
    if (val instanceof Date) {
      date = val;
    } else if (typeof val === "string" && val.includes("-") && val.includes(":")) {
      date = new Date(val);
      if (!val.includes('Z') && !val.includes('+')) {
        date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
      }
    }
    
    if (date && !isNaN(date.getTime())) {
      if (baseDateStr) {
        try {
          const [y, m, d] = baseDateStr.split('-').map(Number);
          const baseDate = new Date(Date.UTC(y, m - 1, d));
          if (!isNaN(baseDate.getTime())) {
            const year = date.getUTCFullYear() < 1970 ? y : date.getUTCFullYear();
            const month = date.getUTCFullYear() < 1970 ? m - 1 : date.getUTCMonth();
            const day = date.getUTCFullYear() < 1970 ? d : date.getUTCDate();
            
            const rowDate = new Date(Date.UTC(year, month, day, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
            const diffMs = rowDate.getTime() - baseDate.getTime();
            return diffMs / (1000 * 60 * 60);
          }
        } catch (e) {}
      }
      return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    }
    
    if (typeof val === "number") {
      if (val > 40000) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return convertToDecimalHours(d, baseDateStr);
      }
      if (val > 0 && val < 1) {
        return val * 24;
      }
      return val / 60;
    }
    
    if (typeof val === "string") {
      const parts = val.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          return h + m / 60;
        }
      }
      const num = Number(val);
      if (!isNaN(num)) return num / 60;
    }
    
    return undefined;
  };

  const getShiftWindowBounds = useCallback((eqData: any[]) => {
    let shiftStart: number | null = null;
    let shiftEnd: number | null = null;

    eqData.forEach((d) => {
      const baseDate = d["Data Turno"] || d["Data Ação"];
      const start = convertToDecimalHours(d["Inicio Calendario"], baseDate);
      const end = convertToDecimalHours(d["Fim Calendario"], baseDate);

      if (start != null && (shiftStart === null || start < shiftStart)) shiftStart = start;
      if (end != null && (shiftEnd === null || end > shiftEnd)) shiftEnd = end;
    });

    return { shiftStart, shiftEnd };
  }, []);

  const getIntervalBounds = useCallback((eqData: any[]) => {
    let intervalStart: number | null = null;
    let intervalEnd: number | null = null;

    eqData.forEach((d) => {
      const baseDate = d["Data Turno"] || d["Data Ação"];
      const start = convertToDecimalHours(d["Inicio intervalo"] || d["Inicio Intervalo"], baseDate);
      const end = convertToDecimalHours(d["Fim intervalo"] || d["Fim Intervalo"], baseDate);

      if (start != null && (intervalStart === null || start < intervalStart)) intervalStart = start;
      if (end != null && (intervalEnd === null || end > intervalEnd)) intervalEnd = end;
    });

    return { intervalStart, intervalEnd };
  }, []);

  const getFirstDispatch = useCallback((eqData: any[]) => {
    const firstDispatchFromOrder = eqData
      .filter((d) => d.hora_aux_ordenacao != null && d.hora_aux_ordenacao > 0)
      .sort((a, b) => a.hora_aux_ordenacao - b.hora_aux_ordenacao)[0]?.hora_aux_ordenacao;

    if (firstDispatchFromOrder != null) return firstDispatchFromOrder;

    let firstDispatch: number | null = null;
    eqData.forEach((d) => {
      const baseDate = d["Data Turno"] || d["Data Ação"];
      const dispatch = convertToDecimalHours(d["1º Despacho"], baseDate);
      if (dispatch != null && (firstDispatch === null || dispatch < firstDispatch)) firstDispatch = dispatch;
    });

    return firstDispatch;
  }, []);

  const getFirstLogin = useCallback((eqData: any[]) => {
    let firstLogin: number | null = null;

    eqData.forEach((d) => {
      const baseDate = d["Data Turno"] || d["Data Ação"];
      const login = convertToDecimalHours(d["Log In"] || d["1º Login"], baseDate);
      if (login != null && (firstLogin === null || login < firstLogin)) firstLogin = login;
    });

    return firstLogin;
  }, []);

  const getPlatformSegment = useCallback((eqData: any[]) => {
    const { shiftStart, shiftEnd } = getShiftWindowBounds(eqData);
    const firstLogin = getFirstLogin(eqData);
    const { intervalStart } = getIntervalBounds(eqData);
    const firstDispatch = getFirstDispatch(eqData);

    const shouldUseEarlyLogin =
      firstLogin != null &&
      shiftStart != null &&
      firstDispatch != null &&
      firstLogin < shiftStart &&
      firstDispatch < shiftStart;

    const start = shouldUseEarlyLogin ? firstLogin : shiftStart ?? firstLogin;
    if (start == null) return null;

    let end: number | null = null;

    if (
      intervalStart != null &&
      intervalStart > start &&
      (shiftEnd == null || intervalStart <= shiftEnd) &&
      (firstDispatch == null || intervalStart <= firstDispatch)
    ) {
      end = intervalStart;
    } else if (firstDispatch != null && firstDispatch > start) {
      end = firstDispatch;
    }

    if (end == null) return null;

    const durationMinutes = (end - start) * 60;
    if (durationMinutes <= 0) return null;

    return { start, end, durationMinutes };
  }, [getFirstDispatch, getFirstLogin, getIntervalBounds, getShiftWindowBounds]);

  // Helper: calculate platform time (login → first incident dispatch) in minutes
  // If the first event after shift start is an interval (before first dispatch), use interval start instead
  const calcTempoPlataforma = (eqData: any[]): number | null => {
    return getPlatformSegment(eqData)?.durationMinutes ?? null;
  };

  // Helper: calculate return to base (last incident "Liberada" → logoff) in minutes
  // If the last event before logoff is an interval, use interval start instead
  const calcRetornoBase = (eqData: any[]): number | null => {
    // Include M300-only rows for same team(s)/date(s) so last-activity end matches the timeline
    const teams = new Set<string>();
    const dates = new Set<string>();
    eqData.forEach((d) => {
      if (d["Equipe Desl."]) teams.add(d["Equipe Desl."]);
      const dt = d["Data Turno"] || d["Data Ação"];
      if (dt) dates.add(dt);
    });
    const incidentKeys = new Set(
      eqData.map((d) => normalizeIncidentNumber(d["Número"])).filter(Boolean)
    );
    const m300Extra = data.filter((d) => {
      if (!d.isM300Only) return false;
      if (!teams.has(d["Equipe Desl."])) return false;
      const dt = d["Data Referência"] || d["Data M300"] || d["Data Turno"] || d["Data Ação"];
      if (!dates.has(dt)) return false;
      const num = normalizeIncidentNumber(d["Número"] || d["Incidente_M300"]);
      return !!num && !incidentKeys.has(num);
    });
    const mergedData = [...eqData, ...m300Extra];

    // Helper: absolute decimal hours for a row's incident start, relative to its Data Turno.
    // hora_aux_ordenacao is the raw hour-of-day of "Data Ação" (0-24). For shifts that cross
    // midnight (Turno A, and Turno C when it extends past 00:00), Data Ação can be a later
    // calendar day than Data Turno, so we must add (Data Ação - Data Turno) * 24 to align
    // with logoff/interval values (which convertToDecimalHours normalizes to Data Turno).
    const absoluteStart = (d: any): number | null => {
      if (d.hora_aux_ordenacao == null) return null;
      let val = Number(d.hora_aux_ordenacao) || 0;
      const dTurno = d["Data Turno"];
      const dAcao = d["Data Ação"];
      if (dTurno && dAcao) {
        try {
          const [yT, mT, dT] = String(dTurno).split("-").map(Number);
          const [yA, mA, dA] = String(dAcao).split("-").map(Number);
          const tT = Date.UTC(yT, mT - 1, dT);
          const tA = Date.UTC(yA, mA - 1, dA);
          if (!isNaN(tT) && !isNaN(tA)) {
            const diffDays = Math.round((tA - tT) / (1000 * 60 * 60 * 24));
            val += diffDays * 24;
          }
        } catch (e) {}
      }
      return val;
    };

    const logoffVal = (() => {
      let best: number | null = null;
      mergedData.forEach(d => {
        const raw = d["Log Off Corrigido"] || d["Log Off"];
        const dec = convertToDecimalHours(raw, d["Data Turno"] || d["Data Ação"]);
        if (dec != null && (best === null || dec > best)) best = dec;
      });
      return best;
    })();
    if (logoffVal == null) return null;

    // Last incident end = latest (inicio_decimal + TMD/60 + TME/60)
    const sorted = mergedData
      .filter(d => d.hora_aux_ordenacao != null)
      .map(d => ({ d, start: absoluteStart(d) }))
      .filter(x => x.start != null)
      .sort((a, b) => {
        const endA = (a.start as number) + (Number(a.d.TMD) || 0) / 60 + (Number(a.d.TME) || 0) / 60;
        const endB = (b.start as number) + (Number(b.d.TMD) || 0) / 60 + (Number(b.d.TME) || 0) / 60;
        return endB - endA;
      });

    const lastIncidentEnd = sorted.length > 0
      ? (sorted[0].start as number) + (Number(sorted[0].d.TMD) || 0) / 60 + (Number(sorted[0].d.TME) || 0) / 60
      : null;

    // Check interval start time
    const intervalStartVal = (() => {
      let val: number | null = null;
      mergedData.forEach(d => {
        const raw = d["Inicio intervalo"] || d["Inicio Intervalo"];
        const dec = convertToDecimalHours(raw, d["Data Turno"] || d["Data Ação"]);
        if (dec != null && (val === null || dec > val)) val = dec;
      });
      return val;
    })();

    // If interval is the last event before logoff (starts after last incident end), use interval start
    let returnStart: number | null = null;
    if (lastIncidentEnd != null && intervalStartVal != null && intervalStartVal >= lastIncidentEnd) {
      returnStart = intervalStartVal;
    } else if (lastIncidentEnd != null) {
      returnStart = lastIncidentEnd;
    } else if (intervalStartVal != null) {
      returnStart = intervalStartVal;
    }

    if (returnStart == null) return null;
    const diff = (logoffVal - returnStart) * 60; // minutes
    return diff > 0 ? diff : null;
  };

  // Teams that had retorno a base > 40 min on any day within the filtered scope
  const teamsWithRetornoAbove40 = useMemo(() => {
    const teams = new Set<string>();
    const byTeamDate: Record<string, any[]> = {};
    filteredDataPreRetorno.forEach((d) => {
      const eq = d["Equipe Desl."];
      const date = d["Data Turno"] || d["Data Ação"];
      if (!eq || !date) return;
      const key = `${eq}||${date}`;
      if (!byTeamDate[key]) byTeamDate[key] = [];
      byTeamDate[key].push(d);
    });
    Object.entries(byTeamDate).forEach(([key, rows]) => {
      const eq = key.split("||")[0];
      const ret = calcRetornoBase(rows);
      if (ret != null && ret > 40) teams.add(eq);
    });
    return teams;
  }, [filteredDataPreRetorno]);

  const filteredData = useMemo(() => {
    if (retornoBase40Filter === "todos") return filteredDataPreRetorno;
    return filteredDataPreRetorno.filter((d) => {
      const has = teamsWithRetornoAbove40.has(d["Equipe Desl."]);
      return retornoBase40Filter === "sim" ? has : !has;
    });
  }, [filteredDataPreRetorno, retornoBase40Filter, teamsWithRetornoAbove40]);

  // Check if a day's shift is complete (has Logoff recorded)
  const isDayShiftComplete = (dayData: any[]): boolean => {
    return dayData.some(d => {
      const logoff = d["Log Off Corrigido"] || d["Log Off"];
      return logoff != null && logoff !== "" && logoff !== "-";
    });
  };

  // Filter out incomplete shift days from data
  const filterCompleteDays = (eqData: any[]): any[] => {
    const dataByDate: Record<string, any[]> = {};
    eqData.forEach(d => {
      const date = d["Data Turno"] || d["Data Ação"];
      if (!dataByDate[date]) dataByDate[date] = [];
      dataByDate[date].push(d);
    });
    const completeDays: any[] = [];
    Object.values(dataByDate).forEach(dayData => {
      if (isDayShiftComplete(dayData)) {
        completeDays.push(...dayData);
      }
    });
    return completeDays;
  };

  // Tempos ideais (em minutos)
  const IDEAL_PLATFORM_MIN = 25;
  const IDEAL_INTERVAL_MIN = 60;
  const IDEAL_RETURN_BASE_MIN = 40;

  const getShiftDurationMinutes = (dayData: any[]): number => {
    const firstRow = dayData[0] || {};
    const inicioTurno = getValMinutes(firstRow["Inicio Calendario"]);
    const fimTurno = getValMinutes(firstRow["Fim Calendario"]);
    let duracaoTurno = 480;
    if (inicioTurno !== null && fimTurno !== null) {
      duracaoTurno = fimTurno - inicioTurno;
      if (duracaoTurno <= 0) duracaoTurno += 1440;
    }
    return duracaoTurno;
  };

  const getIntervalDurationMinutes = (dayData: any[]): number => {
    const firstRow = dayData[0] || {};
    const inicioIntervalo = getValMinutes(firstRow["Inicio Intervalo"]);
    const fimIntervalo = getValMinutes(firstRow["Fim Intervalo"]);
    if (inicioIntervalo !== null && fimIntervalo !== null) {
      let dur = fimIntervalo - inicioIntervalo;
      if (dur <= 0) dur += 1440;
      return dur;
    }
    return 0; // sem intervalo registrado
  };

  // Helper: calculate capped TMD+TME sum for a day, excluding ATENDIMENTO REMOTO
  // and capping incident time at shift end
  const calcCappedTmdTme = (dayData: any[]): number => {
    const firstRow = dayData[0] || {};
    const shiftEndMin = getValMinutes(firstRow["Fim Calendario"]);
    const shiftStartMin = getValMinutes(firstRow["Inicio Calendario"]);

    return dayData.reduce((acc, d) => {
      // Exclude ATENDIMENTO REMOTO from time calculations
      const causa = String(d["Causa"] || "").trim().toUpperCase();
      if (causa === "ATENDIMENTO REMOTO") return acc;

      let tmd = Number(d.TMD) || 0;
      let tme = Number(d.TME) || 0;

      // Cap incident time at shift end
      if (shiftEndMin != null && shiftStartMin != null && d.hora_aux_ordenacao != null) {
        const incStartMin = d.hora_aux_ordenacao * 60;
        let shiftEndAbs = shiftEndMin;
        // Handle overnight shifts
        if (shiftEndAbs <= shiftStartMin) shiftEndAbs += 1440;
        let adjustedIncStart = incStartMin;
        if (adjustedIncStart < shiftStartMin && shiftEndAbs > 1440) adjustedIncStart += 1440;

        const incEndMin = adjustedIncStart + tmd + tme;
        if (incEndMin > shiftEndAbs) {
          const overflow = incEndMin - shiftEndAbs;
          // Reduce TME first, then TMD
          const tmeReduction = Math.min(overflow, tme);
          tme -= tmeReduction;
          const remaining = overflow - tmeReduction;
          if (remaining > 0) tmd = Math.max(0, tmd - remaining);
        }
      }

      return acc + tmd + tme;
    }, 0);
  };

  const calculateOccupancy = (eqData: any[]) => {
    if (eqData.length === 0) return 0;
    
    const dataByDate: Record<string, any[]> = {};
    eqData.forEach(d => {
      const date = d["Data Turno"] || d["Data Ação"];
      if (!dataByDate[date]) dataByDate[date] = [];
      dataByDate[date].push(d);
    });
    
    let totalNumerator = 0;
    let totalDenominator = 0;
    
    Object.values(dataByDate).forEach(dayData => {
      const sumTmdTme = calcCappedTmdTme(dayData);
      
      const tempoPlataforma = calcTempoPlataforma(dayData) ?? IDEAL_PLATFORM_MIN;
      const retornoBase = calcRetornoBase(dayData) ?? IDEAL_RETURN_BASE_MIN;
      const duracaoIntervalo = getIntervalDurationMinutes(dayData) || IDEAL_INTERVAL_MIN;
      const duracaoTurno = getShiftDurationMinutes(dayData);
      
      // Cap at ideal values
      const platCapped = Math.min(tempoPlataforma, IDEAL_PLATFORM_MIN);
      const intervalCapped = Math.min(duracaoIntervalo, IDEAL_INTERVAL_MIN);
      const returnCapped = Math.min(retornoBase, IDEAL_RETURN_BASE_MIN);
      
      totalNumerator += (sumTmdTme + platCapped + intervalCapped + returnCapped);
      totalDenominator += duracaoTurno;
    });
    
    return totalDenominator > 0 ? (totalNumerator / totalDenominator) * 100 : 0;
  };

  // Calcula minutos ociosos: tudo que não é atividade produtiva (inclui excesso de plataforma/intervalo/retorno)
  const calculateIdleMinutes = (eqData: any[]): number => {
    if (eqData.length === 0) return 0;

    const dataByDate: Record<string, any[]> = {};
    eqData.forEach(d => {
      const date = d["Data Turno"] || d["Data Ação"];
      if (!dataByDate[date]) dataByDate[date] = [];
      dataByDate[date].push(d);
    });

    let totalIdle = 0;

    Object.values(dataByDate).forEach(dayData => {
      const sumTmdTme = calcCappedTmdTme(dayData);
      
      const tempoPlataforma = calcTempoPlataforma(dayData) ?? IDEAL_PLATFORM_MIN;
      const retornoBase = calcRetornoBase(dayData) ?? IDEAL_RETURN_BASE_MIN;
      const duracaoIntervalo = getIntervalDurationMinutes(dayData) || IDEAL_INTERVAL_MIN;
      const duracaoTurno = getShiftDurationMinutes(dayData);
      
      // Cap at ideal values
      const platCapped = Math.min(tempoPlataforma, IDEAL_PLATFORM_MIN);
      const intervalCapped = Math.min(duracaoIntervalo, IDEAL_INTERVAL_MIN);
      const returnCapped = Math.min(retornoBase, IDEAL_RETURN_BASE_MIN);

      const idle = duracaoTurno - sumTmdTme - platCapped - intervalCapped - returnCapped;
      totalIdle += Math.max(0, idle);
    });

    return totalIdle;
  };

  // KPIs
  const numDays = useMemo(() => {
    return new Set(filteredData.map(d => d["Data Turno"] || d["Data Ação"])).size || 1;
  }, [filteredData]);

  // Heavy aggregate block — memoized so that merely opening the filter panel,
  // typing in a search box or toggling dialogs does not recompute everything.
  const aggregates = useMemo(() => {
  const totalInc = new Set(filteredData.map((d) => d.Número)).size;
  const displayInc = totalInc;

  // Pre-group rows by "Equipe Desl." once (avoids O(rows × teams) scans below)
  const rowsByEquipe = new Map<string, any[]>();
  filteredData.forEach((d) => {
    const key = d["Equipe Desl."];
    if (!key) return;
    const arr = rowsByEquipe.get(key);
    if (arr) arr.push(d);
    else rowsByEquipe.set(key, [d]);
  });

  const tmdeMedio =
    filteredData.length > 0
      ? filteredData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) /
        filteredData.length
      : 0;
  const reincTotal = countUniqueReincidentes(filteredData);
  const taxaReinc = totalInc > 0 ? reincTotal / totalInc : 0;
  const improdTotal = filteredData.filter((d) => d.Improdutivo).length;
  const taxaImprod = totalInc > 0 ? improdTotal / totalInc : 0;

  // Resultado por Processo
  const processosOrdem = [
    "Emergência",
    "Comercial",
    "Perdas",
    "Poda",
    "Linha Viva",
  ];
  const resumoProcessos = processosOrdem.map((proc) => {
    const procData = filteredData.filter((d) => d.Processo === proc);
    const procRowsByEquipe = new Map<string, any[]>();
    procData.forEach((d) => {
      const key = d["Equipe Desl."];
      if (!key) return;
      const arr = procRowsByEquipe.get(key);
      if (arr) arr.push(d);
      else procRowsByEquipe.set(key, [d]);
    });
    const inc = new Set(procData.map((d) => d.Número)).size;

    const incProdutivos = new Set(procData.filter((d) => !d.Improdutivo).map((d) => d.Número)).size;
    const imp = procData.filter((d) => d.Improdutivo).length;
    const ord2 = procData.filter((d) => d.ordem2).length;
    const reinc = countUniqueReincidentes(procData);
    const tmde =
      procData.length > 0
        ? procData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) / procData.length
        : 0;
    
    const totalTmde = procData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0);
    
    const uniqueTeamsInProc = new Set<string>();
    procData.forEach((d) => {
      const equipeStr = String(d["Equipe Desl."] || "");
      if (!equipeStr || equipeStr === "Não informado") return;
      const teams = equipeStr
        .split(/[/;+]| e /)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t !== "---");
      teams.forEach((t) => uniqueTeamsInProc.add(t));
    });

    const equipesCount = uniqueTeamsInProc.size;

    let somaOcupacao = 0;
    let somaIdleMinutes = 0;
    const equipesPresentesNoProcesso = Array.from(procRowsByEquipe.keys());
    
    let countOcupacaoValidas = 0;
    equipesPresentesNoProcesso.forEach(eq => {
      const eqData = procRowsByEquipe.get(eq) || [];
      const completeData = filterCompleteDays(eqData);
      if (completeData.length === 0) return;
      const occ = calculateOccupancy(completeData);
      somaIdleMinutes += calculateIdleMinutes(completeData);
      if (occ <= 120) {
        somaOcupacao += occ;
        countOcupacaoValidas++;
      }
    });

    const ocupacao = countOcupacaoValidas > 0 ? somaOcupacao / countOcupacaoValidas : 0;
    const avgIdleMinutes = equipesPresentesNoProcesso.length > 0 ? somaIdleMinutes / equipesPresentesNoProcesso.length : 0;
    // In period mode: average daily productivities instead of total/uniqueTeams/days
    let displayProdutividade: number;
    if (isPeriodMode) {
      const byDate: Record<string, any[]> = {};
      procData.forEach(d => {
        const dt = d["Data Turno"] || d["Data Ação"] || "unknown";
        if (!byDate[dt]) byDate[dt] = [];
        byDate[dt].push(d);
      });
      const dailyProds = Object.values(byDate).map(dayData => {
        const dayIncProd = new Set(dayData.filter(d => !d.Improdutivo).map(d => d.Número)).size;
        const dayTeams = new Set<string>();
        dayData.forEach(d => {
          const eq = String(d["Equipe Desl."] || "");
          if (!eq || eq === "Não informado") return;
          eq.split(/[/;+]| e /).map(t => t.trim()).filter(t => t.length > 0 && t !== "---").forEach(t => dayTeams.add(t));
        });
        return dayTeams.size > 0 ? dayIncProd / dayTeams.size : 0;
      });
      displayProdutividade = dailyProds.length > 0 ? dailyProds.reduce((a, b) => a + b, 0) / dailyProds.length : 0;
    } else {
      const produtividade = equipesCount > 0 ? incProdutivos / equipesCount : 0;
      displayProdutividade = produtividade;
    }

    // Login, Despacho, Tempo de Plataforma, Retorno a Base médios por processo
    const loginValues: number[] = [];
    const despachoValues: number[] = [];
    const plataformaValues: number[] = [];
    const retornoValues: number[] = [];
    equipesPresentesNoProcesso.forEach(eq => {
      const eqData = procRowsByEquipe.get(eq) || [];
      let maxLogin: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Login Corrigido"];
        const val = getValMinutes(raw);
        if (val != null && (maxLogin === null || val > maxLogin)) maxLogin = val;
      });
      if (maxLogin !== null) loginValues.push(maxLogin);

      let maxDespacho: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Despacho"];
        const val = getValMinutes(raw);
        if (val != null && (maxDespacho === null || val > maxDespacho)) maxDespacho = val;
      });
      if (maxDespacho !== null) despachoValues.push(maxDespacho);

      const plat = calcTempoPlataforma(eqData);
      if (plat !== null) plataformaValues.push(plat);

      const ret = calcRetornoBase(eqData);
      if (ret !== null) retornoValues.push(ret);
    });

    const avgLogin = loginValues.length > 0 ? loginValues.reduce((a, b) => a + b, 0) / loginValues.length : null;
    const avgDespacho = despachoValues.length > 0 ? despachoValues.reduce((a, b) => a + b, 0) / despachoValues.length : null;
    const avgPlataforma = plataformaValues.length > 0 ? plataformaValues.reduce((a, b) => a + b, 0) / plataformaValues.length : null;
    const avgRetorno = retornoValues.length > 0 ? retornoValues.reduce((a, b) => a + b, 0) / retornoValues.length : null;

    return {
      Processos: proc,
      Incidentes: inc,
      Equipes: equipesCount,
      Improdutivos: imp,
      "Ordem 2": ord2,
      "Reincidentes causados": reinc,
      TMDE: tmde,
      Ocupação: ocupacao,
      "Ociosidade (min)": avgIdleMinutes,
      "Inc. Ociosid.": Math.floor(avgIdleMinutes / 60),
      Produtividade: displayProdutividade,
      Login: avgLogin,
      Despacho: avgDespacho,
      "Tempo Plataforma": avgPlataforma,
      "Retorno Base": avgRetorno,
    };
  });

  const totalIncProdutivos = new Set(filteredData.filter((d) => !d.Improdutivo).map((d) => d.Número)).size;

  const uniqueTeamsGeral = new Set<string>();
  filteredData.forEach((d) => {
    const equipeStr = String(d["Equipe Desl."] || "");
    if (!equipeStr || equipeStr === "Não informado") return;
    const teams = equipeStr
      .split(/[/;+]| e /)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t !== "---");
    teams.forEach((t) => uniqueTeamsGeral.add(t));
  });
  const totalEquipesGeralCount = uniqueTeamsGeral.size;

  let somaOcupacaoGeral = 0;
  let somaIdleMinutesGeral = 0;
  const equipesPresentesGeral = Array.from(rowsByEquipe.keys());
  let countOcupacaoValidasGeral = 0;
  equipesPresentesGeral.forEach(eq => {
    const eqData = rowsByEquipe.get(eq) || [];
    const completeData = filterCompleteDays(eqData);
    if (completeData.length === 0) return;
    const occ = calculateOccupancy(completeData);
    somaIdleMinutesGeral += calculateIdleMinutes(completeData);
    if (occ <= 120) {
      somaOcupacaoGeral += occ;
      countOcupacaoValidasGeral++;
    }
  });
  const ocupacaoMediaGeral = countOcupacaoValidasGeral > 0 ? somaOcupacaoGeral / countOcupacaoValidasGeral : 0;
  const avgIdleMinutesGeral = equipesPresentesGeral.length > 0 ? somaIdleMinutesGeral / equipesPresentesGeral.length : 0;

  // Averages for Login and Tempo Plataforma in total row
  const allLoginVals: number[] = [];
  const allDespachoVals: number[] = [];
  const allPlatVals: number[] = [];
  const allRetornoVals: number[] = [];
  equipesPresentesGeral.forEach(eq => {
    const eqData = rowsByEquipe.get(eq) || [];
    let maxLogin: number | null = null;
    eqData.forEach(d => {
      const raw = d["1º Login Corrigido"];
      const val = getValMinutes(raw);
      if (val != null && (maxLogin === null || val > maxLogin)) maxLogin = val;
    });
    if (maxLogin !== null) allLoginVals.push(maxLogin);

    let maxDespacho: number | null = null;
    eqData.forEach(d => {
      const raw = d["1º Despacho"];
      const val = getValMinutes(raw);
      if (val != null && (maxDespacho === null || val > maxDespacho)) maxDespacho = val;
    });
    if (maxDespacho !== null) allDespachoVals.push(maxDespacho);

    const plat = calcTempoPlataforma(eqData);
    if (plat !== null) allPlatVals.push(plat);

    const ret = calcRetornoBase(eqData);
    if (ret !== null) allRetornoVals.push(ret);
  });

  const totalRowProcessos = {
    Processos: "Total",
    Incidentes: resumoProcessos.reduce((acc, curr) => acc + curr.Incidentes, 0),
    Equipes: totalEquipesGeralCount,
    Improdutivos: resumoProcessos.reduce((acc, curr) => acc + curr.Improdutivos, 0),
    "Ordem 2": resumoProcessos.reduce((acc, curr) => acc + curr["Ordem 2"], 0),
    "Reincidentes causados": resumoProcessos.reduce((acc, curr) => acc + curr["Reincidentes causados"], 0),
    TMDE: tmdeMedio,
    Ocupação: ocupacaoMediaGeral,
    "Ociosidade (min)": avgIdleMinutesGeral,
    "Inc. Ociosid.": Math.floor(avgIdleMinutesGeral / 60),
    Produtividade: (() => {
      if (!isPeriodMode) return totalEquipesGeralCount > 0 ? totalIncProdutivos / totalEquipesGeralCount : 0;
      const byDate: Record<string, any[]> = {};
      filteredData.forEach(d => {
        const dt = d["Data Turno"] || d["Data Ação"] || "unknown";
        if (!byDate[dt]) byDate[dt] = [];
        byDate[dt].push(d);
      });
      const dailyProds = Object.values(byDate).map(dayData => {
        const dayIncProd = new Set(dayData.filter((d: any) => !d.Improdutivo).map((d: any) => d.Número)).size;
        const dayTeams = new Set<string>();
        dayData.forEach((d: any) => {
          const eq = String(d["Equipe Desl."] || "");
          if (!eq || eq === "Não informado") return;
          eq.split(/[/;+]| e /).map((t: string) => t.trim()).filter((t: string) => t.length > 0 && t !== "---").forEach((t: string) => dayTeams.add(t));
        });
        return dayTeams.size > 0 ? dayIncProd / dayTeams.size : 0;
      });
      return dailyProds.length > 0 ? dailyProds.reduce((a, b) => a + b, 0) / dailyProds.length : 0;
    })(),
    Login: allLoginVals.length > 0 ? allLoginVals.reduce((a, b) => a + b, 0) / allLoginVals.length : null,
    Despacho: allDespachoVals.length > 0 ? allDespachoVals.reduce((a, b) => a + b, 0) / allDespachoVals.length : null,
    "Tempo Plataforma": allPlatVals.length > 0 ? allPlatVals.reduce((a, b) => a + b, 0) / allPlatVals.length : null,
    "Retorno Base": allRetornoVals.length > 0 ? allRetornoVals.reduce((a, b) => a + b, 0) / allRetornoVals.length : null,
  };

    return {
      totalInc,
      displayInc,
      tmdeMedio,
      reincTotal,
      taxaReinc,
      improdTotal,
      taxaImprod,
      resumoProcessos,
      totalIncProdutivos,
      totalEquipesGeralCount,
      ocupacaoMediaGeral,
      avgIdleMinutesGeral,
      equipesPresentesGeral,
      totalRowProcessos,
      allLoginVals,
      allDespachoVals,
      allPlatVals,
      allRetornoVals,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, isPeriodMode, data]);

  const {
    totalInc,
    displayInc,
    tmdeMedio,
    reincTotal,
    taxaReinc,
    improdTotal,
    taxaImprod,
    resumoProcessos,
    totalIncProdutivos,
    totalEquipesGeralCount,
    ocupacaoMediaGeral,
    avgIdleMinutesGeral,
    equipesPresentesGeral,
    totalRowProcessos,
    allLoginVals,
    allDespachoVals,
    allPlatVals,
    allRetornoVals,
  } = aggregates;

  // Helper to format values from Excel to minutes (duration)
  const formatToMinutes = (val: any): string => {
    if (val == null || val === "" || val === "-") return "-";
    
    if (typeof val === "number") {
      // If it's a small number (0-1), it's an Excel time serial
      if (val > 0 && val < 1) {
        return String(Math.round(val * 1440));
      }
      // If it's a large number, it might be an Excel date serial
      if (val > 40000) {
        const minutes = Math.round((val - Math.floor(val)) * 1440);
        return String(minutes);
      }
      return Number.isInteger(val) ? String(val) : val.toFixed(1);
    }
    
    if (val instanceof Date) {
      // If it's a Date object, we assume it's a time of day and we want minutes from midnight
      const minutes = val.getUTCHours() * 60 + val.getUTCMinutes();
      return String(minutes);
    }
    
    if (typeof val === "string") {
      const parts = val.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          return String(h * 60 + m);
        }
      }
      const num = Number(val);
      if (!isNaN(num)) return String(Math.round(num));
    }
    
    return String(val);
  };

  // Helper to format values to HH:MM
  const formatToHHMM = (val: any): string => {
    if (val == null || val === "" || val === "-") return "-";
    
    let date: Date | null = null;
    if (val instanceof Date) {
      date = val;
    } else if (typeof val === "number") {
      if (val > 0 && val < 1) {
        const totalMinutes = Math.round(val * 1440);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
      if (val > 40000) {
        date = new Date(Math.round((val - 25569) * 86400 * 1000));
      }
    } else if (typeof val === "string" && val.includes(':')) {
      return val.split(':').slice(0, 2).join(':');
    }

    if (date && !isNaN(date.getTime())) {
      const h = date.getUTCHours();
      const m = date.getUTCMinutes();
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return String(val);
  };

  // Ranking das Equipes
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "pontuacao", direction: "desc" });

  const rankingEquipes = React.useMemo(() => {
    const equipesPresentes = Array.from(
      new Set(filteredData.map((d) => d["Equipe Desl."]).filter(Boolean)),
    ).filter(eq => eq !== "Não informado" && eq !== "---").sort();

    const baseRanking = equipesPresentes.map((eq) => {
      const eqData = filteredData.filter((d) => d["Equipe Desl."] === eq);
      const allDays = new Set(eqData.map(d => d["Data Turno"] || d["Data Ação"]));
      const eqDays = allDays.size || 1;
      
      // Detect incomplete shift days
      const completeDayData = filterCompleteDays(eqData);
      const dataByDate: Record<string, any[]> = {};
      eqData.forEach(d => {
        const date = d["Data Turno"] || d["Data Ação"];
        if (!dataByDate[date]) dataByDate[date] = [];
        dataByDate[date].push(d);
      });
      const completeDays = Object.keys(dataByDate).filter(date => isDayShiftComplete(dataByDate[date]));
      const diasCompletos = completeDays.length;
      const temTurnoEmAndamento = diasCompletos < eqDays;
      
      const inc = new Set(eqData.map((d) => d.Número)).size;
      const imp = eqData.filter((d) => d.Improdutivo).length;
      const reinc = countUniqueReincidentes(eqData);
      const tmde =
        eqData.length > 0
          ? eqData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) / eqData.length
          : 0;

      // Ordem 2
      const ord2 = eqData.filter((d) => d.ordem2).length;

      // Ocupação e Ociosidade — preferimos dias completos (com Log Off),
      // mas se nenhum dia estiver completo (comum no Turno A quando o Log Off
      // não é reconhecido) usamos os dados brutos para não zerar as métricas.
      const baseForMetrics = completeDayData.length > 0 ? completeDayData : eqData;
      const ocupacao = baseForMetrics.length > 0 ? calculateOccupancy(baseForMetrics) : 0;
      const idleMinutes = baseForMetrics.length > 0 ? calculateIdleMinutes(baseForMetrics) : 0;

      // Login
      let maxLoginVal: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Login Corrigido"];
        const val = getValMinutes(raw);
        if (val != null && (maxLoginVal === null || val > maxLoginVal)) maxLoginVal = val;
      });
      const primeiroLogin = maxLoginVal != null ? maxLoginVal.toFixed(1) : "-";

      // Despacho
      let maxDespachoVal: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Despacho"];
        const val = getValMinutes(raw);
        if (val != null && (maxDespachoVal === null || val > maxDespachoVal)) maxDespachoVal = val;
      });
      const despacho = maxDespachoVal != null ? maxDespachoVal.toFixed(1) : "-";

      // Tempo de plataforma (login → first dispatch)
      const platVal = calcTempoPlataforma(eqData);
      const tempoPlataforma = platVal != null ? platVal.toFixed(1) : "-";

      // Retorno a base (last liberada → logoff)
      const retVal = calcRetornoBase(eqData);
      const retornoBase = retVal != null ? retVal.toFixed(1) : "-";

      return {
        Equipe: eq,
        Incidentes: inc,
        Improdutivos: imp,
        "Reincidentes causados": reinc,
        TMDE: tmde,
        "Ordem 2": ord2,
        Ocupação: ocupacao,
        Dias: eqDays,
        "Ociosidade (min)": idleMinutes,
        "Inc. Ociosid.": Math.floor(idleMinutes / 60),
        Login: primeiroLogin,
        Despacho: despacho,
        "Tempo de plataforma": tempoPlataforma,
        "Retorno Base": retornoBase,
        diasTrabalhados: eqDays,
        diasCompletos,
        turnoEmAndamento: temTurnoEmAndamento,
      };
    });
    // Note: Teams whose shift has no recorded Log Off (e.g. Turno A in progress
    // or missing logoff data) are kept in the ranking. Ocupação/Ociosidade
    // will be 0 for them, and the ⏳ indicator flags the incomplete shift.

    const scored = calculateRankingScores(baseRanking, rankingWeights);

    scored.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];

      if (sortConfig.key === 'Login' || sortConfig.key === 'Tempo de plataforma' || sortConfig.key === 'Despacho' || sortConfig.key === 'Retorno Base') {
        aValue = aValue === '-' ? -1 : Number(aValue);
        bValue = bValue === '-' ? -1 : Number(bValue);
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return scored;
  }, [filteredData, sortConfig, rankingWeights]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  // Seleção de Equipe
  const [selectedEquipesDetalhe, setSelectedEquipesDetalhe] = useState<string[]>([]);
  const [highlightedIncidents, setHighlightedIncidents] = useState<string[]>([]);
  const [selectedTimelineDay, setSelectedTimelineDay] = useState<string>("");
  const [selectedObservation, setSelectedObservation] = useState<{
    numero: string;
    texto: string;
  } | null>(null);

  // Update selected equipe if ranking changes and current is not in it
  React.useEffect(() => {
    if (rankingEquipes.length > 0) {
      // Se um incidente específico foi selecionado, selecionamos todas as equipes relacionadas a ele
      if (selectedIncidents.length > 0) {
        const allTeamsForIncident = rankingEquipes.map(r => r.Equipe);
        setSelectedEquipesDetalhe(allTeamsForIncident);
        return;
      }

      const validSelected = selectedEquipesDetalhe.filter(eq => rankingEquipes.some(r => r.Equipe === eq));
      if (validSelected.length === 0) {
        setSelectedEquipesDetalhe([rankingEquipes[0].Equipe]);
      } else if (validSelected.length !== selectedEquipesDetalhe.length) {
        setSelectedEquipesDetalhe(validSelected);
      }
    } else {
      setSelectedEquipesDetalhe([]);
    }
  }, [rankingEquipes, selectedIncidents]);

  const equipeDetalheData = useMemo(() => {
    return filteredData
      .filter((d) => {
        if (!selectedEquipesDetalhe.includes(d["Equipe Desl."])) return false;
        // In period mode, filter by selected timeline day
        if (isPeriodMode && selectedTimelineDay) {
          const dt = d["Data Turno"] || d["Data Ação"];
          if (dt !== selectedTimelineDay) return false;
        }
        return true;
      })
      .sort((a, b) => (a.hora_aux_ordenacao || 0) - (b.hora_aux_ordenacao || 0));
  }, [filteredData, selectedEquipesDetalhe, isPeriodMode, selectedTimelineDay]);

  // Available days for selected teams (used in period mode timeline dropdown)
  const availableTimelineDays = useMemo(() => {
    if (!isPeriodMode) return [];
    const days = new Set<string>();
    filteredData.forEach(d => {
      if (selectedEquipesDetalhe.includes(d["Equipe Desl."])) {
        const dt = d["Data Turno"] || d["Data Ação"];
        if (dt) days.add(dt);
      }
    });
    return Array.from(days).sort();
  }, [filteredData, selectedEquipesDetalhe, isPeriodMode]);

  // Auto-select first available day when switching to period mode or changing teams
  React.useEffect(() => {
    if (isPeriodMode && availableTimelineDays.length > 0 && !availableTimelineDays.includes(selectedTimelineDay)) {
      setSelectedTimelineDay(availableTimelineDays[availableTimelineDays.length - 1]);
    }
  }, [isPeriodMode, availableTimelineDays]);

  // The effective date for the timeline (in period mode, use the dropdown; otherwise use selectedData)
  const timelineEffectiveDate = isPeriodMode ? selectedTimelineDay : selectedData;

  const timelineFilteredData = useMemo(() => {
    if (!isPeriodMode) return filteredData;
    return filteredData.filter(d => {
      const dt = d["Data Turno"] || d["Data Ação"];
      return dt === selectedTimelineDay;
    });
  }, [filteredData, isPeriodMode, selectedTimelineDay]);

  const timelineData = useMemo(() => selectedEquipesDetalhe.map(equipe => {
    const incidentesPlotados = timelineFilteredData.filter((d) => d["Equipe Desl."] === equipe);
    const incidentesBaseKeys = new Set(
      incidentesPlotados.map((d) => normalizeIncidentNumber(d["Número"]))
    );
    const incidentesM300Only = data.filter((d) => {
      if (!d.isM300Only) return false;
      if (d["Equipe Desl."] !== equipe) return false;

      const dataM300 = d["Data Referência"] || d["Data M300"] || d["Data Turno"] || d["Data Ação"];
      if (isPeriodMode ? dataM300 !== selectedTimelineDay : !matchesSelectedDateFilter(dataM300)) return false;

      const numeroNormalizado = normalizeIncidentNumber(d["Número"] || d["Incidente_M300"]);
      return !!numeroNormalizado && !incidentesBaseKeys.has(numeroNormalizado);
    });

    const equipeData = [...incidentesPlotados, ...incidentesM300Only].sort(
      (a, b) => (a.hora_aux_ordenacao || 0) - (b.hora_aux_ordenacao || 0)
    );
    
    if (equipeData.length === 0) return { equipe, events: [] };

    const firstRow = equipeData[0] || {};
    const teamTurno = firstRow.Turno || "B";

    const events = equipeData
      .filter((d) => d.hora_aux_ordenacao != null)
      .map((d) => {
        let inicio_decimal = Number(d.hora_aux_ordenacao) || 0;
        if (timelineEffectiveDate && d["Data Ação"]) {
          try {
            const [ySel, mSel, daySel] = timelineEffectiveDate.split('-').map(Number);
            const [yAcao, mAcao, dayAcao] = d["Data Ação"].split('-').map(Number);
            
            const dSel = new Date(Date.UTC(ySel, mSel - 1, daySel));
            const dAcao = new Date(Date.UTC(yAcao, mAcao - 1, dayAcao));
            
            if (!isNaN(dSel.getTime()) && !isNaN(dAcao.getTime())) {
              const diffDays = Math.round((dAcao.getTime() - dSel.getTime()) / (1000 * 60 * 60 * 24));
              inicio_decimal += diffDays * 24;
            }
          } catch (e) {
            console.error("Erro ao calcular diff de dias", e);
          }
        }

        const isAtribuida = d.ordem2 && d.isIdentificadorO2;
        const isDeslocada = d.ordem2 && d.isExecutorO2;
        const isExecutorO2 = !!d.isExecutorO2;
        const isIdentificadorO2 = !!d.isIdentificadorO2;

        return {
          id: d.Número,
          inicio_decimal,
          TMD: Number(d.TMD) || 0,
          TME: Number(d.TME) || 0,
          TMDE: Number(d.TMDE) || 0,
          origTMD: d.origTMD,
          origTME: d.origTME,
          origTMDE: d.origTMDE,
          improdutivo: !!d.Improdutivo,
          ordem2: !!d.ordem2,
          reincidenteCausado: isReincidenteCausadoRow(d),
          isM300Only: !!d.isM300Only,
          possivelO2: !!d.possivelO2,
          possivelAnomalia: !!d.possivelAnomalia,
          isAtribuidaO2: isAtribuida || (!!d.possivelO2 && !!d.isAtribuidaO2),
          isDeslocadaO2: isDeslocada || (!!d.possivelO2 && !!d.isDeslocadaO2),
          isExecutorO2,
          isIdentificadorO2,
          tempoPadrao: Number(d.tempo_padrao) || 60,
          dataAcao: d["Data Ação"],
          horaAcao: d["Hora da ação equipe"],
        };
      });

    const firstLoginRaw = equipeData
      .map((d) => d["Log In"] || d["1º Login"])
      .find((v) => v != null && v !== "");
    const firstLoginDecimal = convertToDecimalHours(firstLoginRaw, timelineEffectiveDate);

    const shiftStartDecimal = convertToDecimalHours(firstRow["Inicio Calendario"], timelineEffectiveDate);
    const shiftEndDecimal = convertToDecimalHours(firstRow["Fim Calendario"], timelineEffectiveDate);
    const intervalStartDecimal = convertToDecimalHours(firstRow["Inicio Intervalo"] || firstRow["Inicio intervalo"], timelineEffectiveDate);
    const intervalEndDecimal = convertToDecimalHours(firstRow["Fim Intervalo"] || firstRow["Fim intervalo"], timelineEffectiveDate);
    
    // Platform duration: shift start → first incident dispatch.
    // Exception: use first login only when both login and first incident happened before shift start.
    let platformDuration = undefined;
    let platformStart = shiftStartDecimal ?? firstLoginDecimal ?? undefined;
    let platformEnd = undefined as number | undefined;
    
    if (platformStart != null && events.length > 0) {
      const sortedEvents = [...events].sort((a, b) => a.inicio_decimal - b.inicio_decimal);
      const firstEventStart = sortedEvents[0].inicio_decimal;
      if (
        firstLoginDecimal != null &&
        shiftStartDecimal != null &&
        firstLoginDecimal < shiftStartDecimal &&
        firstEventStart < shiftStartDecimal
      ) {
        platformStart = firstLoginDecimal;
      }
      
      // Check if interval happens before first dispatch
      if (intervalStartDecimal != null && intervalStartDecimal > platformStart && intervalStartDecimal <= firstEventStart) {
        platformEnd = intervalStartDecimal;
      } else if (firstEventStart > platformStart) {
        platformEnd = firstEventStart;
      }
      
      if (platformEnd != null) {
        platformDuration = platformEnd - platformStart;
        if (platformDuration <= 0) platformDuration = undefined;
      }
    }

    // Return to base: last incident "Liberada" (end) → logoff (in decimal hours)
    const lastLogOffRaw = equipeData
      .map((d) => d["Log Off Corrigido"] || d["Log Off"])
      .find((v) => v != null && v !== "");
    const lastLogOffDecimal = convertToDecimalHours(lastLogOffRaw, timelineEffectiveDate);
    
    let returnToBaseDuration = undefined;
    if (lastLogOffDecimal != null && events.length > 0) {
      const lastEvent = [...events].sort((a, b) => {
        const endA = a.inicio_decimal + a.TMD / 60 + a.TME / 60;
        const endB = b.inicio_decimal + b.TMD / 60 + b.TME / 60;
        return endB - endA;
      })[0];
      const lastEnd = lastEvent.inicio_decimal + lastEvent.TMD / 60 + lastEvent.TME / 60;

      // If interval starts after last incident, use interval start as return-to-base origin
      let returnStart = lastEnd;
      if (intervalStartDecimal != null && intervalStartDecimal >= lastEnd) {
        returnStart = intervalStartDecimal;
      }

      const diff = lastLogOffDecimal - returnStart;
      if (diff > 0) returnToBaseDuration = diff;
    }

    return { 
      equipe, 
      events,
      turno: teamTurno,
      shiftStartHour: getShiftStartHour(teamTurno),
      shiftStart: convertToDecimalHours(firstRow["Inicio Calendario"], timelineEffectiveDate),
      shiftEnd: shiftEndDecimal,
      platformStart,
      platformEnd,
      platformDuration,
      firstLogin: firstLoginDecimal,
      intervalStart: intervalStartDecimal,
      intervalEnd: intervalEndDecimal,
      returnToBaseDuration,
      lastLogOff: lastLogOffDecimal ?? convertToDecimalHours(firstRow["Log Off Corrigido"] || firstRow["Log Off"], timelineEffectiveDate),
    };
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectedEquipesDetalhe, timelineFilteredData, data, isPeriodMode, selectedTimelineDay, timelineEffectiveDate]);

  const handlePasswordAction = useCallback(async () => {
    if (isSaving || !pendingAction) return;

    if (passwordInput !== "dys") {
      toast.error("Senha incorreta.");
      return;
    }

    try {
      if (!rawInc || rawInc.length === 0) {
        toast.error("Nenhum dado bruto disponível para salvar.");
        return;
      }
      await saveRawData({
        incRaw: rawInc,
        m300Raw: rawM300 || [],
        incFileName: sourceFiles?.incFileName,
        m300FileName: sourceFiles?.m300FileName,
        processedData: rawData,
      });
      toast.success("Dashboard salvo com sucesso!");
      setPendingAction(null);
      setPasswordInput("");
    } catch {
      toast.error("Erro ao salvar dashboard.");
    }
  }, [isSaving, passwordInput, pendingAction, rawData, rawInc, rawM300, saveRawData, sourceFiles?.incFileName, sourceFiles?.m300FileName]);

  const currentShiftStartHour = useMemo(() => {
    if (selectedTurnos.length === 1) {
      if (selectedTurnos[0] === "A") return 16;
      if (selectedTurnos[0] === "B") return 0;
      if (selectedTurnos[0] === "C") return 12;
    }
    // If multiple or none, check if all teams in timelineData have same shift
    const distinctShifts = new Set(timelineData.map(t => t.turno));
    if (distinctShifts.size === 1) {
      const s = Array.from(distinctShifts)[0];
      if (s === "A") return 16;
      if (s === "B") return 0;
      if (s === "C") return 12;
    }
    return 0; // Default
  }, [selectedTurnos, timelineData]);

  const activeFilterCount = [
    selectedPolos.length > 0,
    selectedProcessos.length > 0,
    selectedTiposEquipe.length > 0,
    selectedTurnos.length > 0,
    selectedEquipes.length > 0,
    selectedIncidents.length > 0,
    tmdeAbove150Filter !== "todos",
    o2AnomaliaFilter !== "todos",
    retornoBase40Filter !== "todos",
    teamOriginFilter !== "todos",
    improdutivoFilter !== "todos",
  ].filter(Boolean).length;

  if (isInvalidData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-card rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Erro de Dados</h2>
          <p className="text-muted-foreground">Os dados fornecidos são inválidos ou estão vazios.</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">Voltar</button>
        </div>
      </div>
    );
  }

  if (showPoloAnalysis) {
    const filterButton = (
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                {activeFilterCount}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Modo de Análise</label>
                  <button
                    onClick={() => setIsPeriodMode(!isPeriodMode)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPeriodMode ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${isPeriodMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              {!isPeriodMode && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    Dia
                  </label>
                  <select value={selectedData} onChange={(e) => setSelectedData(e.target.value)} className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none">
                    <option value="">Todos</option>
                    {datas.map((d) => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
              )}
              {isPeriodMode && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    Período
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">De</span>
                      <select value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none">
                        {datas.map((d) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Até</span>
                      <select value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none">
                        {datas.filter(d => d >= periodStart).map((d) => (<option key={d} value={d}>{d}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <FilterMultiSelect label="Polo" options={polos} selected={selectedPolos} onChange={setSelectedPolos} />
              <FilterMultiSelect label="Processo" options={processos} selected={selectedProcessos} onChange={setSelectedProcessos} />
              <FilterMultiSelect label="Insourcing / Outsourcing" options={tiposEquipe} selected={selectedTiposEquipe} onChange={setSelectedTiposEquipe} />
              <FilterMultiSelect label="Turno" options={turnos} selected={selectedTurnos} onChange={setSelectedTurnos} />
              <FilterMultiSelect label="Equipe" options={equipes} selected={selectedEquipes} onChange={setSelectedEquipes} searchable={true} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );

    return (
      <>
        <PoloAnalysisView
          filteredData={filteredData}
          onBack={() => setShowPoloAnalysis(false)}
          weights={rankingWeights}
          isPeriodMode={isPeriodMode}
          numDays={numDays}
          calculateOccupancy={calculateOccupancy}
          calculateIdleMinutes={calculateIdleMinutes}
          calcTempoPlataforma={calcTempoPlataforma}
          calcRetornoBase={calcRetornoBase}
          getValMinutes={getValMinutes}
          onTeamClick={(team) => setTeamDetailModal(team)}
          filterTrigger={filterButton}
          activeFilterCount={activeFilterCount}
        />
        {teamDetailModal && (
          <TeamDetailModal
            team={teamDetailModal}
            allData={filteredData}
            isPeriodMode={isPeriodMode}
            convertToDecimalHours={convertToDecimalHours}
            getValMinutes={getValMinutes}
            calcTempoPlataforma={calcTempoPlataforma}
            calcRetornoBase={calcRetornoBase}
            calculateOccupancy={calculateOccupancy}
            calculateIdleMinutes={calculateIdleMinutes}
            normalizeIncidentNumber={normalizeIncidentNumber}
            data={data}
            onClose={() => setTeamDetailModal(null)}
          />
        )}
      </>
    );
  }

  if (showGestaoAVista) {
    return (
      <GestaoAVistaView
        filteredData={filteredData}
        onBack={() => setShowGestaoAVista(false)}
        isPeriodMode={isPeriodMode}
        numDays={numDays}
        calculateOccupancy={calculateOccupancy}
        calculateIdleMinutes={calculateIdleMinutes}
        calcTempoPlataforma={calcTempoPlataforma}
        calcRetornoBase={calcRetornoBase}
        getValMinutes={getValMinutes}
        filterState={{
          isPeriodMode, setIsPeriodMode,
          selectedData, setSelectedData,
          periodStart, setPeriodStart,
          periodEnd, setPeriodEnd,
          selectedPolos, setSelectedPolos,
          selectedProcessos, setSelectedProcessos,
          selectedTiposEquipe, setSelectedTiposEquipe,
          selectedTurnos, setSelectedTurnos,
          selectedEquipes, setSelectedEquipes,
          selectedIncidents, setSelectedIncidents,
          tmdeAbove150Filter, setTmdeAbove150Filter,
          o2AnomaliaFilter, setO2AnomaliaFilter,
          datas, polos, processos, tiposEquipe, turnos, equipes, incidents,
          activeFilterCount,
        }}
      />
    );
  }

  if (showEvolucaoTemporal) {
    const filterButton = (
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-80 sm:w-96 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border bg-secondary/30">
            <SheetTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filtros (Evolução Temporal)
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-5">
              <p className="text-[11px] text-muted-foreground bg-secondary/30 p-2 rounded">
                💡 Nesta tela o filtro de <strong>dia/período</strong> é ignorado para preservar a série temporal completa.
              </p>
              <FilterMultiSelect label="Polo" options={polos} selected={selectedPolos} onChange={setSelectedPolos} />
              <FilterMultiSelect label="Processo" options={processos} selected={selectedProcessos} onChange={setSelectedProcessos} />
              <FilterMultiSelect label="Insourcing / Outsourcing" options={tiposEquipe} selected={selectedTiposEquipe} onChange={setSelectedTiposEquipe} />
              <FilterMultiSelect label="Turno" options={turnos} selected={selectedTurnos} onChange={setSelectedTurnos} />
              <FilterMultiSelect label="Equipe" options={equipes} selected={selectedEquipes} onChange={setSelectedEquipes} searchable={true} />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );

    // Evolução ignora filtro de dia/período — usa toda a base, aplicando apenas filtros categóricos
    const evolucaoData = data.filter((d) => {
      if (d.isM300Only) return false;
      if (d["Equipe Desl."] === "---") return false;
      if (selectedPolos.length > 0 && !selectedPolos.includes(d.Polo)) return false;
      if (selectedProcessos.length > 0 && !selectedProcessos.includes(d.Processo)) return false;
      if (selectedTiposEquipe.length > 0 && !selectedTiposEquipe.includes(d["Enel / Parceira DESLOC"])) return false;
      if (selectedTurnos.length > 0) {
        const equipe = String(d["Equipe Desl."] || "");
        const firstEquipe = equipe.split(/[/;+]| e /)[0].trim();
        const parts = firstEquipe.split("-");
        let rowTurno = "Outros";
        if (parts.length >= 2) {
          const letter = parts[1].charAt(0).toUpperCase();
          if (["A", "B", "C"].includes(letter)) rowTurno = letter;
        }
        if (!selectedTurnos.includes(rowTurno)) return false;
      }
      if (selectedEquipes.length > 0 && !selectedEquipes.includes(d["Equipe Desl."])) return false;
      return true;
    });

    return (
      <EvolucaoTemporalView
        filteredData={evolucaoData}
        onBack={() => setShowEvolucaoTemporal(false)}
        calculateOccupancy={calculateOccupancy}
        calculateIdleMinutes={calculateIdleMinutes}
        calcTempoPlataforma={calcTempoPlataforma}
        calcRetornoBase={calcRetornoBase}
        getValMinutes={getValMinutes}
        filterTrigger={filterButton}
      />
    );
  }

  return (
    <div className="h-screen w-full min-w-0 max-w-full bg-background flex flex-col overflow-x-hidden overflow-y-hidden">
      {/* Top Bar */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0" title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">Dashboard Operacional</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Análise Polos */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowPoloAnalysis(true)}
          >
            <Trophy className="h-3.5 w-3.5" />
            Análise Polos
          </Button>
          {/* Gestão à Vista */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowGestaoAVista(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Gestão à Vista
          </Button>
          {/* Evolução Temporal */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowEvolucaoTemporal(true)}
          >
            <LineChart className="h-3.5 w-3.5" />
            Evolução
          </Button>
          {/* Resumo M300 */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowM300Summary(true)}
            title="Resumo M300 por Polo"
          >
            <Table2 className="h-3.5 w-3.5" />
          </Button>
          {/* Active filter badges */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 mr-2">
              <Badge variant="secondary" className="text-[10px] font-mono gap-1">
                <Filter className="h-3 w-3" />
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setSelectedPolos([]);
                  setSelectedProcessos([]);
                  setSelectedTiposEquipe([]);
                  setSelectedTurnos([]);
                  setSelectedEquipes([]);
                  setSelectedIncidents([]);
                  setTmdeAbove150Filter("todos");
                  setO2AnomaliaFilter("todos");
                  setRetornoBase40Filter("todos");
                  setTeamOriginFilter("todos");
                  setImprodutivoFilter("todos");
                }}
              >
                Limpar tudo
              </Button>
            </div>
          )}

          {selectedEquipesDetalhe.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedEquipesDetalhe([])}
            >
              Limpar Seleção de Equipes
            </Button>
          )}

          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setPendingAction("save")}
            disabled={isSaving || !rawInc || rawInc.length === 0}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </Button>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                    {activeFilterCount}
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
                        onClick={() => setIsPeriodMode(!isPeriodMode)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPeriodMode ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card transition-transform ${isPeriodMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Data / Período */}
                  {!isPeriodMode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Dia
                      </label>
                      <select
                        value={selectedData}
                        onChange={(e) => setSelectedData(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="">Todos</option>
                        {datas.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isPeriodMode && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Período
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">De</span>
                          <select
                            value={periodStart}
                            onChange={(e) => setPeriodStart(e.target.value)}
                            className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                          >
                            {datas.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Até</span>
                          <select
                            value={periodEnd}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                          >
                            {datas.filter(d => d >= periodStart).map((d) => (
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
                        value={tmdeAbove150Filter}
                        onChange={(e) => setTmdeAbove150Filter(e.target.value)}
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
                        value={o2AnomaliaFilter}
                        onChange={(e) => setO2AnomaliaFilter(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="todos">Todos</option>
                        <option value="o2">Possível O2</option>
                        <option value="anomalia">Possível Anomalia</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Retorno à Base &gt; 40 min</label>
                      <select
                        value={retornoBase40Filter}
                        onChange={(e) => setRetornoBase40Filter(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="todos">Todos</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Origem da Equipe (prefixo)</label>
                      <select
                        value={teamOriginFilter}
                        onChange={(e) => setTeamOriginFilter(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="todos">Todas</option>
                        <option value="propria">Própria (mesmo Polo)</option>
                        <option value="emprestada">Emprestada (outro Polo)</option>
                        <option value="desconhecida">Prefixo desconhecido</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Considerar Improdutivos</label>
                      <select
                        value={improdutivoFilter}
                        onChange={(e) => setImprodutivoFilter(e.target.value)}
                        className="w-full rounded-md bg-background text-foreground border border-border text-xs p-2 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                      >
                        <option value="todos">Tudo</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-4">
                    <FilterMultiSelect label="Polo" options={polos} selected={selectedPolos} onChange={setSelectedPolos} />
                    <FilterMultiSelect label="Processo" options={processos} selected={selectedProcessos} onChange={setSelectedProcessos} />
                    <FilterMultiSelect label="Insourcing / Outsourcing" options={tiposEquipe} selected={selectedTiposEquipe} onChange={setSelectedTiposEquipe} />
                    <FilterMultiSelect label="Turno" options={turnos} selected={selectedTurnos} onChange={setSelectedTurnos} />
                    <FilterMultiSelect label="Equipe" options={equipes} selected={selectedEquipes} onChange={setSelectedEquipes} searchable={true} />
                    <FilterMultiSelect label="Incidente" options={incidents} selected={selectedIncidents} onChange={setSelectedIncidents} searchable={true} />
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4 mr-2 text-warning" />
              <h3 className="text-xs font-medium">Incidentes</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {displayInc}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              <h3 className="text-xs font-medium">TMDE Médio</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {tmdeMedio.toFixed(1)}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <BarChart3 className="h-4 w-4 mr-2 text-accent" />
              <h3 className="text-xs font-medium">Taxa Reincidência</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(taxaReinc * 100).toFixed(1)}%
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <XCircle className="h-4 w-4 mr-2 text-destructive" />
              <h3 className="text-xs font-medium">% Improdutivo</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(taxaImprod * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <LogIn className="h-4 w-4 mr-2 text-success" />
              <h3 className="text-xs font-medium">Login Médio</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {allLoginVals.length > 0 ? (allLoginVals.reduce((a, b) => a + b, 0) / allLoginVals.length).toFixed(1) : "-"}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <Navigation className="h-4 w-4 mr-2 text-primary" />
              <h3 className="text-xs font-medium">Despacho Médio</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {allDespachoVals.length > 0 ? (allDespachoVals.reduce((a, b) => a + b, 0) / allDespachoVals.length).toFixed(1) : "-"}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <Timer className="h-4 w-4 mr-2" style={{ color: "hsl(142 71% 45%)" }} />
              <h3 className="text-xs font-medium">T. Plataforma Médio</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {allPlatVals.length > 0 ? (allPlatVals.reduce((a, b) => a + b, 0) / allPlatVals.length).toFixed(1) : "-"}
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="flex items-center text-muted-foreground mb-2">
              <RotateCcw className="h-4 w-4 mr-2" style={{ color: "hsl(0 65% 60%)" }} />
              <h3 className="text-xs font-medium">Ret. Base Médio</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {allRetornoVals.length > 0 ? (allRetornoVals.reduce((a, b) => a + b, 0) / allRetornoVals.length).toFixed(1) : "-"}
            </p>
          </div>
        </div>

        {/* Resultado por Processo */}
        <div className="glass-card mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/30">
            <h2 className="text-lg font-semibold text-foreground">
              📋 Resultado por Processo
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full divide-y divide-border">
              <thead className="bg-secondary/30">
                <tr>
                  {[
                    "Processos",
                    "Incidentes",
                    "Equipes",
                    "Improdutivos",
                    "Ordem 2",
                    "Reinc.",
                    "TMDE",
                    "Ocup.",
                    "Ociosid.(min)",
                    "Inc. Ociosid.",
                    "Prod.",
                    "Login",
                    "Desp.",
                    "T. Plat.",
                    "Ret. Base",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider truncate"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {[...resumoProcessos, totalRowProcessos].map((row, idx) => (
                  <tr
                    key={row.Processos}
                    className={
                      idx === resumoProcessos.length
                        ? "bg-secondary/30 font-semibold"
                        : ""
                    }
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-foreground truncate">
                      {row.Processos}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Incidentes}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Equipes}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Improdutivos}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Ordem 2"]}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Reincidentes causados"]}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.TMDE.toFixed(1)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Ocupação.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Ociosidade (min)"].toFixed(0)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Inc. Ociosid."]}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Produtividade.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Login != null ? row.Login.toFixed(1) : "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Despacho != null ? row.Despacho.toFixed(1) : "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Tempo Plataforma"] != null ? row["Tempo Plataforma"].toFixed(1) : "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Retorno Base"] != null ? row["Retorno Base"].toFixed(1) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking das Equipes */}
        <div className="glass-card mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center">
              🏆 Ranking das Equipes
              <span className="ml-3 text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {selectedEquipesDetalhe.length} selecionada(s)
              </span>
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedEquipesDetalhe(rankingEquipes.map(r => r.Equipe))}
                className="px-3 py-1 text-sm bg-card border border-border hover:bg-secondary/30 text-primary rounded-md shadow-sm transition-colors"
              >
                Selecionar Todos
              </button>
              {selectedEquipesDetalhe.length > 0 && (
                <button
                  onClick={() => setSelectedEquipesDetalhe([])}
                  className="px-3 py-1 text-sm bg-card border border-border hover:bg-secondary/30 text-foreground/80 rounded-md shadow-sm transition-colors"
                >
                  Limpar Seleção
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-[900px] w-full divide-y divide-border">
              <thead className="bg-secondary/30 sticky top-0">
                <tr>
                  {[
                    "Pos",
                    "Equipe",
                    "Pts",
                    "Dias",
                    "Inc.",
                    "Improd.",
                    "Ord.2",
                    "Reinc.",
                    "TMDE",
                    "Ocup.",
                    "Ociosid.(min)",
                    "Inc. Ociosid.",
                    "Login",
                    "Desp.",
                    "T. Plat.",
                    "Ret. Base",
                  ].map((h, i) => {
                    const sortKeys = ["pontuacao","Equipe","pontuacao","diasTrabalhados","Incidentes","Improdutivos","Ordem 2","Reincidentes causados","TMDE","Ocupação","Ociosidade (min)","Inc. Ociosid.","Login","Despacho","Tempo de plataforma","Retorno Base"];
                    return (
                    <th
                      key={h}
                      onClick={() => handleSort(sortKeys[i])}
                      className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-background select-none truncate"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{h}</span>
                        {sortConfig.key === sortKeys[i] && (
                          <span className="text-muted-foreground/70">
                            {sortConfig.direction === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {rankingEquipes.map((row, idx) => {
                  const isSelected = selectedEquipesDetalhe.includes(row.Equipe);
                  return (
                    <tr 
                      key={row.Equipe} 
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-secondary/30'}`}
                      onClick={() => {
                        setSelectedEquipesDetalhe(prev => 
                          prev.includes(row.Equipe) 
                            ? prev.filter(e => e !== row.Equipe)
                            : [...prev, row.Equipe]
                        );
                      }}
                      onDoubleClick={() => setTeamDetailModal(row)}
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-foreground flex items-center truncate">
                        <input 
                          type="checkbox" 
                          className="mr-2 h-3.5 w-3.5 text-primary focus:ring-ring border-border rounded cursor-pointer"
                          checked={isSelected}
                          readOnly
                        />
                        <span className="truncate">{row.Equipe}</span>
                        {row.hasIncompleteData && <span className="text-warning ml-0.5 text-xs">*</span>}
                        {(row as any).turnoEmAndamento && <span className="ml-1 text-[10px] text-amber-500" title="Turno em andamento (dias incompletos excluídos do cálculo de ocupação)">⏳</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-bold text-primary">
                        {row.pontuacao}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground" title={`${(row as any).diasCompletos} completo(s) de ${(row as any).diasTrabalhados}`}>
                        {(row as any).diasTrabalhados}
                        {(row as any).turnoEmAndamento && <span className="text-amber-500 text-[10px] ml-0.5">({(row as any).diasCompletos}✓)</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Incidentes}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Improdutivos}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row["Ordem 2"]}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row["Reincidentes causados"]}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.TMDE.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Ocupação.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row["Ociosidade (min)"].toFixed(0)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row["Inc. Ociosid."]}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Login}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Despacho}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground truncate">
                        {row["Tempo de plataforma"]}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row["Retorno Base"]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhes das Equipes Selecionadas */}
        {selectedEquipesDetalhe.length > 0 && (
          <div className="glass-card mb-8 overflow-hidden min-w-0 w-full max-w-full">
            <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-foreground">
                  🔎 Detalhes das Equipes Selecionadas
                </h2>
                <button
                  onClick={() => setSelectedEquipesDetalhe([])}
                  className="px-3 py-1 text-sm bg-card border border-border hover:bg-secondary/30 text-foreground/80 rounded-md shadow-sm transition-colors"
                >
                  Limpar Seleção
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedEquipesDetalhe.length} equipe(s) selecionada(s)
              </span>
            </div>

            <div className="p-6 min-w-0 w-full max-w-full overflow-hidden">
              {/* Timeline */}
              <div className="mb-8 w-full min-w-0 overflow-hidden">
                {isPeriodMode && availableTimelineDays.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dia da Timeline:</label>
                    <select
                      value={selectedTimelineDay}
                      onChange={(e) => setSelectedTimelineDay(e.target.value)}
                      className="rounded-md bg-background text-foreground border border-border text-xs p-1.5 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                    >
                      {availableTimelineDays.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <TimelineChart
                  data={timelineData}
                  onEventClick={(id, isMulti) => {
                    setHighlightedIncidents(prev => {
                      if (isMulti) {
                        if (prev.includes(id)) {
                          return prev.filter(i => i !== id);
                        } else {
                          return [...prev, id];
                        }
                      } else {
                        return [id];
                      }
                    });
                  }}
                  highlightedIds={highlightedIncidents}
                  onRemoveTeam={(equipe) => {
                    setSelectedEquipesDetalhe(prev => prev.filter(e => e !== equipe));
                  }}
                  shiftStartHour={currentShiftStartHour}
                />
              </div>

              {/* Tabela de Incidentes da Equipe */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  📑 Incidentes das Equipes Selecionadas
                </h3>
                <div className="overflow-x-auto max-h-96 border rounded-lg">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-secondary/30 sticky top-0">
                      <tr>
                        {[
                          "Número",
                          "Data início",
                          "Data fim",
                          "Hora da ação equipe",
                          "Causa",
                          "Observação",
                          "Grupo Processos DESLOC",
                          "Enel / Parceira DESLOC",
                          "Polo",
                          "Improdutivo",
                          "Ordem 2 da equipe",
                          "Reincidente Causado",
                          "TMDE",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {equipeDetalheData.map((row, idx) => {
                        const ord2Equipe = row.ordem2;
                        const isHighlighted = highlightedIncidents.includes(row.Número);
                        return (
                          <tr 
                            key={idx} 
                            id={`incident-${row.Número}`}
                            className={`hover:bg-secondary/30 transition-colors cursor-pointer ${isHighlighted ? 'bg-warning/20 ring-2 ring-warning ring-inset' : ''}`}
                            onClick={(e) => {
                              setHighlightedIncidents(prev => {
                                if (e.ctrlKey || e.metaKey) {
                                  return prev.includes(row.Número) ? prev.filter(i => i !== row.Número) : [...prev, row.Número];
                                }
                                return [row.Número];
                              });
                            }}
                          >
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-foreground">
                              {row.Número}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {row["Data Início"] ? row["Data Início"].split('-').reverse().join('/') : ""}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {row["Data Fim"] ? row["Data Fim"].split('-').reverse().join('/') : ""}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {typeof row["Hora da ação equipe"] === "number"
                                ? new Date(
                                    row["Hora da ação equipe"] * 86400000,
                                  )
                                    .toISOString()
                                    .substr(11, 8)
                                : String(row["Hora da ação equipe"] || "")}
                            </td>
                            <td
                              className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground max-w-xs truncate"
                              title={row.Causa}
                            >
                              {row.Causa}
                            </td>
                            <td
                              className="px-4 py-2 whitespace-nowrap text-sm text-primary max-w-xs truncate cursor-pointer hover:underline"
                              title="Clique para ver a observação completa"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedObservation({
                                  numero: row.Número,
                                  texto: row.Observação,
                                });
                              }}
                            >
                              {row.Observação}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {row["Grupo Processos DESLOC"]}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {row["Enel / Parceira DESLOC"]}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {row.Polo}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {row.Improdutivo ? "Sim" : "Não"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {ord2Equipe ? "Sim" : "Não"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">
                              {isReincidenteCausadoRow(row) ? "Sim" : "Não"}
                            </td>
                            <td className={`px-4 py-2 whitespace-nowrap text-sm ${row.TME > (row.tempo_padrao || 60) ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                              {row.TME != null ? (row.TME > (row.tempo_padrao || 60) ? `>${row.tempo_padrao || 60}min` : `<=${row.tempo_padrao || 60}min`) : row.TMDE}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Observação */}
      {selectedObservation && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedObservation(null)}
        >
          <div 
            className="bg-card rounded-xl border border-border shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-secondary/30 flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-primary" />
                Observação do Incidente: {selectedObservation.numero}
              </h3>
              <button 
                onClick={() => setSelectedObservation(null)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {selectedObservation.texto || "Nenhuma observação registrada."}
            </div>
            <div className="p-4 border-t bg-secondary/30 flex justify-end">
              <button 
                onClick={() => setSelectedObservation(null)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password confirmation dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-2xl border border-border p-6 w-80">
            <h3 className="text-sm font-semibold text-foreground mb-1">Salvar Dashboard</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {saveProgress || "Os dados brutos serão salvos para acesso de todos os usuários. Dados anteriores serão substituídos."}
            </p>
            <input
              type="password"
              placeholder="Senha de administrador"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handlePasswordAction();
                }
              }}
              className="w-full rounded-md bg-background text-foreground border border-border text-sm p-2 mb-3 focus:border-ring focus:ring-1 focus:ring-ring outline-none"
              autoFocus
              disabled={isSaving}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" disabled={isSaving} onClick={() => { setPendingAction(null); setPasswordInput(""); }}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => void handlePasswordAction()}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team Detail Modal */}
      {teamDetailModal && (
        <TeamDetailModal
          team={teamDetailModal}
          allData={filteredData}
          isPeriodMode={isPeriodMode}
          convertToDecimalHours={convertToDecimalHours}
          getValMinutes={getValMinutes}
          calcTempoPlataforma={calcTempoPlataforma}
          calcRetornoBase={calcRetornoBase}
          calculateOccupancy={calculateOccupancy}
          calculateIdleMinutes={calculateIdleMinutes}
          normalizeIncidentNumber={normalizeIncidentNumber}
          data={data}
          onClose={() => setTeamDetailModal(null)}
        />
      )}
      <M300SummaryDialog
        open={showM300Summary}
        onOpenChange={setShowM300Summary}
        filteredData={filteredData}
        getValMinutes={getValMinutes}
        filterState={{
          isPeriodMode, setIsPeriodMode,
          selectedData, setSelectedData,
          periodStart, setPeriodStart,
          periodEnd, setPeriodEnd,
          selectedPolos, setSelectedPolos,
          selectedProcessos, setSelectedProcessos,
          selectedTiposEquipe, setSelectedTiposEquipe,
          selectedTurnos, setSelectedTurnos,
          selectedEquipes, setSelectedEquipes,
          selectedIncidents, setSelectedIncidents,
          tmdeAbove150Filter, setTmdeAbove150Filter,
          o2AnomaliaFilter, setO2AnomaliaFilter,
          datas, polos, processos, tiposEquipe, turnos, equipes, incidents,
          activeFilterCount,
        }}
      />
    </div>
  );
}
