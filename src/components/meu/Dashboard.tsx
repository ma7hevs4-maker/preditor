import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TimelineChart } from "./TimelineChart";
import { getShiftStartHour } from "../../utils/meuDataProcessing";

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
}

export function Dashboard({ data, onBack }: DashboardProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  if (!data || !Array.isArray(data)) {
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
        new Set(data.map((d) => d["Enel / Parceira DESLOC"]).filter(Boolean)),
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
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "mes">("7d");
  const [selectedData, setSelectedData] = useState<string>(datas[datas.length - 1] || "");
  const [selectedPolos, setSelectedPolos] = useState<string[]>([]);
  const [selectedProcessos, setSelectedProcessos] = useState<string[]>([]);
  const [selectedTiposEquipe, setSelectedTiposEquipe] = useState<string[]>([]);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [selectedEquipes, setSelectedEquipes] = useState<string[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [tmdeAbove150Filter, setTmdeAbove150Filter] = useState<string>("todos");
  const [o2AnomaliaFilter, setO2AnomaliaFilter] = useState<string>("todos");

  // Apply filters
  const dataFilteredByBasics = useMemo(() => {
    return data.filter((d) => {
      if (d["Equipe Desl."] === "---") return false;
      
      const rowDateStr = d["Data Turno"] || d["Data Ação"];
      if (!rowDateStr) return false;

      if (!isPeriodMode) {
        if (selectedData && rowDateStr !== selectedData) return false;
      } else {
        if (selectedData) {
          const [ySel, mSel, dSel] = selectedData.split('-').map(Number);
          const selDate = new Date(ySel, mSel - 1, dSel);
          
          const [yRow, mRow, dRow] = rowDateStr.split('-').map(Number);
          const rowDate = new Date(yRow, mRow - 1, dRow);

          if (selectedPeriod === "7d") {
            const diffTime = selDate.getTime() - rowDate.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);
            if (diffDays < 0 || diffDays >= 7) return false;
          } else if (selectedPeriod === "mes") {
            if (ySel !== yRow || mSel !== mRow) return false;
          }
        }
      }

      if (selectedPolos.length > 0 && !selectedPolos.includes(d.Polo))
        return false;
      if (
        selectedProcessos.length > 0 &&
        !selectedProcessos.includes(d.Processo)
      )
        return false;
      if (
        selectedTiposEquipe.length > 0 &&
        !selectedTiposEquipe.includes(d["Enel / Parceira DESLOC"])
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
      return true;
    });
  }, [
    data,
    selectedData,
    isPeriodMode,
    selectedPeriod,
    selectedPolos,
    selectedProcessos,
    selectedTiposEquipe,
    selectedTurnos,
    selectedEquipes,
    selectedIncidents,
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

  const filteredData = useMemo(() => {
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

  const calculateOccupancy = (eqData: any[]) => {
    if (eqData.length === 0) return 0;
    
    // Group by date to handle multiple days if selected
    const dataByDate: Record<string, any[]> = {};
    eqData.forEach(d => {
      const date = d["Data Turno"] || d["Data Ação"];
      if (!dataByDate[date]) dataByDate[date] = [];
      dataByDate[date].push(d);
    });
    
    let totalNumerator = 0;
    let totalDenominator = 0;
    
    Object.values(dataByDate).forEach(dayData => {
      // soma de todo tmd e tme da equipe no dia, desconsiderando tmde > 150 (exceto se for possível o2 ou anomalia)
      const incidentsToCount = dayData.filter(d => (Number(d.TMDE) || 0) <= 150 || d.possivelO2 || d.possivelAnomalia);
      const sumTmdTme = incidentsToCount.reduce((acc, d) => acc + (Number(d.TMD) || 0) + (Number(d.TME) || 0), 0);
      
      const firstRow = dayData[0] || {};
      
      // tempo de plataforma (caso n tenha o valor será considerado 40 min)
      const tempoPlataforma = getValMinutes(firstRow["1º Desloc"]) ?? 40;
      
      // retorno a base (caso n tenha o valor será considerado 30 min)
      const retornoBase = getValMinutes(firstRow["Retorno a base"]) ?? 30;
      
      // Fim Calendario pelo Inicio Calendario (caso n tenha o valor será considerado 480 min)
      const inicioTurno = getValMinutes(firstRow["Inicio Calendario"]);
      const fimTurno = getValMinutes(firstRow["Fim Calendario"]);
      let duracaoTurno = 480;
      if (inicioTurno !== null && fimTurno !== null) {
        duracaoTurno = fimTurno - inicioTurno;
        if (duracaoTurno <= 0) duracaoTurno += 1440;
      }
      
      // intervalo (caso n tenha o valor será considerado 60 min)
      const inicioIntervalo = getValMinutes(firstRow["Inicio Intervalo"]);
      const fimIntervalo = getValMinutes(firstRow["Fim Intervalo"]);
      let duracaoIntervalo = 60;
      if (inicioIntervalo !== null && fimIntervalo !== null) {
        duracaoIntervalo = fimIntervalo - inicioIntervalo;
        if (duracaoIntervalo <= 0) duracaoIntervalo += 1440;
      }
      
      totalNumerator += (sumTmdTme + tempoPlataforma + duracaoIntervalo + retornoBase);
      totalDenominator += duracaoTurno;
    });
    
    return totalDenominator > 0 ? (totalNumerator / totalDenominator) * 100 : 0;
  };

  // KPIs
  const numDays = useMemo(() => {
    return new Set(filteredData.map(d => d["Data Turno"] || d["Data Ação"])).size || 1;
  }, [filteredData]);

  const totalInc = new Set(filteredData.map((d) => d.Número)).size;
  const displayInc = isPeriodMode ? totalInc / numDays : totalInc;

  const tmdeMedio =
    filteredData.length > 0
      ? filteredData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) /
        filteredData.length
      : 0;
  const reincTotal = filteredData.filter(
    (d) => d["Reincidente Causado"],
  ).length;
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
    const inc = new Set(procData.map((d) => d.Número)).size;
    const displayIncProc = isPeriodMode ? inc / numDays : inc;

    const incProdutivos = new Set(procData.filter((d) => !d.Improdutivo).map((d) => d.Número)).size;
    const imp = procData.filter((d) => d.Improdutivo).length;
    const ord2 = procData.filter((d) => d.ordem2).length;
    const reinc = procData.filter((d) => d["Reincidente Causado"]).length;
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
    const equipesPresentesNoProcesso = Array.from(
      new Set(procData.map((d) => d["Equipe Desl."]).filter(Boolean))
    );
    
    equipesPresentesNoProcesso.forEach(eq => {
      const eqData = procData.filter(d => d["Equipe Desl."] === eq);
      const ocupacaoEquipe = calculateOccupancy(eqData);
      somaOcupacao += ocupacaoEquipe;
    });

    const ocupacao = equipesPresentesNoProcesso.length > 0 ? somaOcupacao / equipesPresentesNoProcesso.length : 0;
    const produtividade = equipesCount > 0 ? incProdutivos / equipesCount : 0;
    const displayProdutividade = isPeriodMode ? produtividade / numDays : produtividade;

    // Login médio e Tempo de Plataforma médio por processo
    const loginValues: number[] = [];
    const plataformaValues: number[] = [];
    equipesPresentesNoProcesso.forEach(eq => {
      const eqData = procData.filter(d => d["Equipe Desl."] === eq);
      // Max login for this team
      let maxLogin: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Login Corrigido"] || d["Log In"];
        const val = convertToDecimalHours(raw);
        if (val != null && (maxLogin === null || val > maxLogin)) maxLogin = val;
      });
      if (maxLogin !== null) loginValues.push(maxLogin);

      // Max tempo plataforma (1º Desloc) for this team
      let maxPlat: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Desloc"];
        const val = getValMinutes(raw);
        if (val != null && (maxPlat === null || val > maxPlat)) maxPlat = val;
      });
      if (maxPlat !== null) plataformaValues.push(maxPlat);
    });

    const avgLogin = loginValues.length > 0 ? loginValues.reduce((a, b) => a + b, 0) / loginValues.length : null;
    const avgPlataforma = plataformaValues.length > 0 ? plataformaValues.reduce((a, b) => a + b, 0) / plataformaValues.length : null;

    return {
      Processos: proc,
      Incidentes: displayIncProc,
      Equipes: equipesCount,
      Improdutivos: isPeriodMode ? imp / numDays : imp,
      "Ordem 2": isPeriodMode ? ord2 / numDays : ord2,
      "Reincidentes causados": isPeriodMode ? reinc / numDays : reinc,
      TMDE: tmde,
      Ocupação: ocupacao,
      Produtividade: displayProdutividade,
      Login: avgLogin,
      "Tempo Plataforma": avgPlataforma,
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
  const equipesPresentesGeral = Array.from(
    new Set(filteredData.map((d) => d["Equipe Desl."]).filter(Boolean))
  );
  equipesPresentesGeral.forEach(eq => {
    const eqData = filteredData.filter(d => d["Equipe Desl."] === eq);
    const ocupacaoEquipe = calculateOccupancy(eqData);
    somaOcupacaoGeral += ocupacaoEquipe;
  });
  const ocupacaoMediaGeral = equipesPresentesGeral.length > 0 ? somaOcupacaoGeral / equipesPresentesGeral.length : 0;

  // Averages for Login and Tempo Plataforma in total row
  const allLoginVals: number[] = [];
  const allPlatVals: number[] = [];
  equipesPresentesGeral.forEach(eq => {
    const eqData = filteredData.filter(d => d["Equipe Desl."] === eq);
    let maxLogin: number | null = null;
    eqData.forEach(d => {
      const raw = d["1º Login Corrigido"] || d["Log In"];
      const val = convertToDecimalHours(raw);
      if (val != null && (maxLogin === null || val > maxLogin)) maxLogin = val;
    });
    if (maxLogin !== null) allLoginVals.push(maxLogin);

    let maxPlat: number | null = null;
    eqData.forEach(d => {
      const raw = d["1º Desloc"];
      const val = getValMinutes(raw);
      if (val != null && (maxPlat === null || val > maxPlat)) maxPlat = val;
    });
    if (maxPlat !== null) allPlatVals.push(maxPlat);
  });

  const totalRowProcessos = {
    Processos: "Total",
    Incidentes: resumoProcessos.reduce((acc, curr) => acc + curr.Incidentes, 0),
    Equipes: totalEquipesGeralCount,
    Improdutivos: resumoProcessos.reduce(
      (acc, curr) => acc + curr.Improdutivos,
      0,
    ),
    "Ordem 2": resumoProcessos.reduce((acc, curr) => acc + curr["Ordem 2"], 0),
    "Reincidentes causados": resumoProcessos.reduce(
      (acc, curr) => acc + curr["Reincidentes causados"],
      0,
    ),
    TMDE: tmdeMedio,
    Ocupação: ocupacaoMediaGeral,
    Produtividade: isPeriodMode ? (totalIncProdutivos / totalEquipesGeralCount) / numDays : totalIncProdutivos / totalEquipesGeralCount,
    Login: allLoginVals.length > 0 ? allLoginVals.reduce((a, b) => a + b, 0) / allLoginVals.length : null,
    "Tempo Plataforma": allPlatVals.length > 0 ? allPlatVals.reduce((a, b) => a + b, 0) / allPlatVals.length : null,
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
            // If the date is just a time (Excel serial < 1, or year < 1970), assume it's on the baseDate
            const year = date.getUTCFullYear() < 1970 ? y : date.getUTCFullYear();
            const month = date.getUTCFullYear() < 1970 ? m - 1 : date.getUTCMonth();
            const day = date.getUTCFullYear() < 1970 ? d : date.getUTCDate();
            
            const rowDate = new Date(Date.UTC(
              year, 
              month, 
              day, 
              date.getUTCHours(), 
              date.getUTCMinutes(), 
              date.getUTCSeconds()
            ));
            const diffMs = rowDate.getTime() - baseDate.getTime();
            return diffMs / (1000 * 60 * 60);
          }
        } catch (e) {}
      }
      return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    }
    
    if (typeof val === "number") {
      // If it's a large number, it might be an Excel serial with date
      if (val > 40000) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        return convertToDecimalHours(d, baseDateStr);
      }
      // If it's a small number (0-1), it's a time of day
      if (val > 0 && val < 1) {
        return val * 24;
      }
      // Otherwise assume it's minutes (duration)
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "Incidentes", direction: "desc" });

  const rankingEquipes = React.useMemo(() => {
    const equipesPresentes = Array.from(
      new Set(filteredData.map((d) => d["Equipe Desl."]).filter(Boolean)),
    ).filter(eq => eq !== "Não informado" && eq !== "---").sort();

    const baseRanking = equipesPresentes.map((eq) => {
      const eqData = filteredData.filter((d) => d["Equipe Desl."] === eq);
      const eqDays = new Set(eqData.map(d => d["Data Turno"] || d["Data Ação"])).size || 1;
      
      const inc = new Set(eqData.map((d) => d.Número)).size;
      const imp = eqData.filter((d) => d.Improdutivo).length;
      const reinc = eqData.filter((d) => d["Reincidente Causado"]).length;
      const tmde =
        eqData.length > 0
          ? eqData.reduce((acc, curr) => acc + (Number(curr.TMDE) || 0), 0) / eqData.length
          : 0;

      // Ordem 2
      const ord2 = eqData.filter((d) => d.ordem2).length;

      // Ocupação
      const ocupacao = calculateOccupancy(eqData);

      // Login: max of "1º Login Corrigido" from M300 base
      let maxLoginVal: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Login Corrigido"] || d["Log In"];
        const val = convertToDecimalHours(raw);
        if (val != null && (maxLoginVal === null || val > maxLoginVal)) maxLoginVal = val;
      });
      const primeiroLogin = maxLoginVal != null ? (() => {
        const h = Math.floor(maxLoginVal);
        const m = Math.round((maxLoginVal - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      })() : "-";

      // Tempo de plataforma: max of "1º Desloc" from M300 base
      let maxPlatVal: number | null = null;
      eqData.forEach(d => {
        const raw = d["1º Desloc"];
        const val = getValMinutes(raw);
        if (val != null && (maxPlatVal === null || val > maxPlatVal)) maxPlatVal = val;
      });
      const tempoPlataforma = maxPlatVal != null ? maxPlatVal.toFixed(1) : "-";

      return {
        Equipe: eq,
        Incidentes: isPeriodMode ? inc / eqDays : inc,
        Improdutivos: isPeriodMode ? imp / eqDays : imp,
        "Reincidentes causados": isPeriodMode ? reinc / eqDays : reinc,
        TMDE: tmde,
        "Ordem 2": isPeriodMode ? ord2 / eqDays : ord2,
        Ocupação: ocupacao,
        Login: primeiroLogin,
        "Tempo de plataforma": tempoPlataforma,
      };
    });

    baseRanking.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];

      if (sortConfig.key === 'Login') {
        const parseHHMM = (s: string) => {
          if (s === '-') return -1;
          const [h, m] = s.split(':').map(Number);
          return h * 60 + m;
        };
        aValue = parseHHMM(aValue);
        bValue = parseHHMM(bValue);
      } else if (sortConfig.key === 'Tempo de plataforma') {
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

    return baseRanking;
  }, [filteredData, sortConfig]);

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
      .filter((d) => selectedEquipesDetalhe.includes(d["Equipe Desl."]))
      .sort((a, b) => (a.hora_aux_ordenacao || 0) - (b.hora_aux_ordenacao || 0));
  }, [filteredData, selectedEquipesDetalhe]);

  const timelineData = selectedEquipesDetalhe.map(equipe => {
    const equipeData = filteredData.filter((d) => d["Equipe Desl."] === equipe);
    
    if (equipeData.length === 0) return { equipe, events: [] };

    const firstRow = equipeData[0] || {};
    const teamTurno = firstRow.Turno || "B";
    
    const events = equipeData
      .filter((d) => d.hora_aux_ordenacao != null)
      .map((d) => {
        let inicio_decimal = Number(d.hora_aux_ordenacao) || 0;
        if (selectedData && d["Data Ação"]) {
          try {
            const [ySel, mSel, daySel] = selectedData.split('-').map(Number);
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
      .map((d) => d["1º Login Corrigido"] || d["Log In"])
      .find((v) => v != null && v !== "");
    const firstLoginDecimal = convertToDecimalHours(firstLoginRaw, selectedData);

    const firstIncident = [...events].sort((a, b) => a.inicio_decimal - b.inicio_decimal)[0];
    
    let platformDuration = undefined;
    if (firstLoginDecimal != null && firstIncident) {
      platformDuration = firstIncident.inicio_decimal - firstLoginDecimal;
      if (platformDuration < 0) platformDuration = 0;
    }

    return { 
      equipe, 
      events,
      turno: teamTurno,
      shiftStartHour: getShiftStartHour(teamTurno),
      shiftStart: convertToDecimalHours(firstRow["Inicio Calendario"], selectedData),
      shiftEnd: convertToDecimalHours(firstRow["Fim Calendario"], selectedData),
      platformDuration,
      firstLogin: firstLoginDecimal,
      intervalStart: convertToDecimalHours(firstRow["Inicio Intervalo"], selectedData),
      intervalEnd: convertToDecimalHours(firstRow["Fim Intervalo"], selectedData),
      returnToBaseDuration: convertToDecimalHours(firstRow["Retorno a base"]), // This is a duration
      lastLogOff: convertToDecimalHours(firstRow["Log Off Corrigido"] || firstRow["Log Off"], selectedData),
    };
  });

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
  ].filter(Boolean).length;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8" title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard Operacional
          </h1>
        </div>

        <div className="flex items-center gap-2">
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
                    {isPeriodMode && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelectedPeriod("7d")}
                          className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${selectedPeriod === "7d" ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
                        >
                          7 DIAS
                        </button>
                        <button
                          onClick={() => setSelectedPeriod("mes")}
                          className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${selectedPeriod === "mes" ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}
                        >
                          MÊS
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Data */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {isPeriodMode ? 'Data de Referência' : 'Dia'}
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
      <div className="flex-1 min-w-0 p-6 overflow-y-auto overflow-x-hidden relative">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center text-muted-foreground mb-2">
              <AlertTriangle className="h-5 w-5 mr-2 text-warning" />
              <h3 className="text-sm font-medium">Incidentes</h3>
            </div>
            <p className="kpi-value text-foreground">
              {isPeriodMode ? displayInc.toFixed(1) : displayInc}
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center text-muted-foreground mb-2">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-sm font-medium">TMDE Médio</h3>
            </div>
            <p className="kpi-value text-foreground">
              {tmdeMedio.toFixed(1)}
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center text-muted-foreground mb-2">
              <BarChart3 className="h-5 w-5 mr-2 text-accent" />
              <h3 className="text-sm font-medium">Taxa Reincidência</h3>
            </div>
            <p className="kpi-value text-foreground">
              {(taxaReinc * 100).toFixed(1)}%
            </p>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center text-muted-foreground mb-2">
              <XCircle className="h-5 w-5 mr-2 text-destructive" />
              <h3 className="text-sm font-medium">% Improdutivo</h3>
            </div>
            <p className="kpi-value text-foreground">
              {(taxaImprod * 100).toFixed(1)}%
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
            <table className="w-full divide-y divide-border table-fixed">
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
                    "Prod.",
                    "Login",
                    "T. Plat.",
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
                      {isPeriodMode ? row.Incidentes.toFixed(1) : row.Incidentes}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Equipes}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {isPeriodMode ? row.Improdutivos.toFixed(1) : row.Improdutivos}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {isPeriodMode ? row["Ordem 2"].toFixed(1) : row["Ordem 2"]}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {isPeriodMode ? row["Reincidentes causados"].toFixed(1) : row["Reincidentes causados"]}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.TMDE.toFixed(1)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Ocupação.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Produtividade.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row.Login != null ? (() => {
                        const h = Math.floor(row.Login);
                        const m = Math.round((row.Login - h) * 60);
                        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      })() : "-"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {row["Tempo Plataforma"] != null ? row["Tempo Plataforma"].toFixed(1) : "-"}
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
            <table className="w-full divide-y divide-border table-fixed">
              <thead className="bg-secondary/30 sticky top-0">
                <tr>
                  {[
                    "Equipe",
                    "Inc.",
                    "Improd.",
                    "Ord.2",
                    "Reinc.",
                    "TMDE",
                    "Ocup.",
                    "Login",
                    "T. Plat.",
                  ].map((h, i) => {
                    const sortKeys = ["Equipe","Incidentes","Improdutivos","Ordem 2","Reincidentes causados","TMDE","Ocupação","Login","Tempo de plataforma"];
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
                {rankingEquipes.map((row) => {
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
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-foreground flex items-center truncate">
                        <input 
                          type="checkbox" 
                          className="mr-2 h-3.5 w-3.5 text-primary focus:ring-ring border-border rounded cursor-pointer"
                          checked={isSelected}
                          readOnly
                        />
                        <span className="truncate">{row.Equipe}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Turno}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {isPeriodMode ? row.Incidentes.toFixed(1) : row.Incidentes}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {isPeriodMode ? row.Improdutivos.toFixed(1) : row.Improdutivos}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {isPeriodMode ? row["Ordem 2"].toFixed(1) : row["Ordem 2"]}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {isPeriodMode ? row["Reincidentes causados"].toFixed(1) : row["Reincidentes causados"]}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.TMDE.toFixed(1)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Ocupação.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {row.Login}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground truncate">
                        {row["Tempo de plataforma"]}
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
          <div className="glass-card mb-8 overflow-hidden">
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

            <div className="p-6">
              {/* Timeline */}
              <div className="mb-8">
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
                              {row["Reincidente Causado"] ? "Sim" : "Não"}
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
    </div>
  );
}
