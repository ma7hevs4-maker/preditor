import * as XLSX from "xlsx";

export function normalizarProcesso(x: string): string {
  const s = String(x).trim().toLowerCase();
  if (s.includes("emerg")) return "Emergência";
  if (s.includes("comerc")) return "Comercial";
  if (s.includes("perda")) return "Perdas";
  if (s.includes("poda")) return "Poda";
  if (s.includes("linha viva") || s.includes("linhaviva")) return "Linha Viva";
  return "Outros";
}

export function horaParaDecimalSeguro(valor: any): number | null {
  if (valor == null || valor === "") return null;

  // If it's a number (Excel decimal time or serial)
  if (typeof valor === "number") {
    // If it's a date-time serial, take the fractional part
    const timePart = valor - Math.floor(valor);
    return timePart * 24;
  }

  // If it's a Date object
  if (valor instanceof Date) {
    return valor.getUTCHours() + valor.getUTCMinutes() / 60 + valor.getUTCSeconds() / 3600;
  }

  const s = String(valor).trim();

  // Try HH:MM:SS or HH:MM
  const timeParts = s.split(":");
  if (timeParts.length >= 2) {
    const h = parseInt(timeParts[0], 10);
    const m = parseInt(timeParts[1], 10);
    const sec = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
    if (!isNaN(h) && !isNaN(m)) {
      return h + m / 60 + sec / 3600;
    }
  }

  // Try parsing as a date string
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    // If the string has 'Z' or '+', it's absolute, otherwise it's local
    if (s.includes('Z') || s.includes('+')) {
      return dt.getUTCHours() + dt.getUTCMinutes() / 60 + dt.getUTCSeconds() / 3600;
    }
    // If no timezone, treat as UTC wall-clock
    return dt.getUTCHours() + dt.getUTCMinutes() / 60 + dt.getUTCSeconds() / 3600;
  }

  // Try parsing as a float string like "0,5"
  try {
    const v = parseFloat(s.replace(",", "."));
    if (!isNaN(v)) {
      const timePart = v - Math.floor(v);
      return timePart * 24;
    }
  } catch (e) {}

  return null;
}

export function getShiftStartHour(turno: string): number {
  const t = String(turno).toUpperCase();
  if (t === "A") return 16; // Turno A starts ~22-23h, so group all incidents from 16h+ as same shift date
  if (t === "B") return 0;
  if (t === "C") return 12;
  return 0; // Default to 0 for "Outros"
}

export function getTurnoFromEquipe(equipe: string): string {
  const e = String(equipe || "").trim();
  const firstEquipe = e.split(/[/;+]| e /)[0].trim();
  const parts = firstEquipe.split("-");
  if (parts.length >= 2) {
    const letter = parts[1].charAt(0).toUpperCase();
    if (["A", "B", "C"].includes(letter)) return letter;
  }
  return "Outros";
}

// Date parsing helper
export const parseDate = (val: any) => {
  if (!val) return null;
  if (val instanceof Date) {
    // Use UTC components because XLSX puts wall-clock time in UTC
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof val === 'string') {
    const s = val.trim().split(' ')[0];
    if (s.includes('-')) return s;
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return null;
};

export function calculateShiftDate(date: Date | string, hour: number, shiftStartHour: number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);

  const shiftDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (hour < shiftStartHour) {
    shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
  }
  return parseDate(shiftDate);
}

export async function readExcelToJson(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: true });
}

// Clean column names helper
const cleanKeys = (obj: any) => {
  if (!obj || typeof obj !== 'object') return {};
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key.trim()] = obj[key];
    }
  }
  return newObj;
};

export function processRawData(incRaw: any[], m300Raw: any[]) {
  const inc = (incRaw || []).map(cleanKeys);
  const m300 = (m300Raw || []).map(cleanKeys);

  // Filter "FECHADO"
  let filteredInc = inc.filter((row: any) => {
    const status = String(row["Status"] || "")
      .trim()
      .toUpperCase();
    if (status !== "FECHADO") return false;

    // Excluir incidentes com causa "PROGRAMADA"
    const causa = String(row["Causa"] || "").trim().toUpperCase();
    if (causa.includes("PROGRAMADA")) return false;

    return true;
  });

  const parseFullDateTime = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
      return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    if (typeof val === 'string') {
      const parts = val.trim().split(' ');
      if (parts.length >= 2) {
        const dateParts = parts[0].split(/[-/]/);
        const timeParts = parts[1].split(':');
        if (dateParts.length === 3 && timeParts.length >= 2) {
          let y, m, d;
          if (dateParts[0].length === 4) {
            y = parseInt(dateParts[0]);
            m = parseInt(dateParts[1]) - 1;
            d = parseInt(dateParts[2]);
          } else {
            y = parseInt(dateParts[2]);
            if (y < 100) y += 2000;
            m = parseInt(dateParts[1]) - 1;
            d = parseInt(dateParts[0]);
          }
          const h = parseInt(timeParts[0]);
          const min = parseInt(timeParts[1]);
          const s = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;
          return new Date(Date.UTC(y, m, d, h, min, s));
        }
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        if (!val.includes('Z') && !val.includes('+')) {
          return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
        }
        return d;
      }
    }
    return null;
  };

  // Process INC
  filteredInc = filteredInc.map((row: any) => {
    if (!row) return {};
    const rowKeys = Object.keys(row);
    const dataFimKey = rowKeys.find(k => k.toLowerCase().includes('data fim')) || "Data Fim";
    const dataInicioKey = rowKeys.find(k => k.toLowerCase().includes('data início') || k.toLowerCase().includes('data inicio')) || "Data Início";
    
    // IMPORTANT: parse full datetime BEFORE overwriting with date-only strings
    const fullDataFim = parseFullDateTime(row[dataFimKey]);
    const fullDataInicio = parseFullDateTime(row[dataInicioKey]);
    
    const dataFim = parseDate(row[dataFimKey]);
    row["Data Fim"] = dataFim;
    const dataInicio = parseDate(row[dataInicioKey]);
    row["Data Início"] = dataInicio;
    let horaAcao = horaParaDecimalSeguro(row["Hora da ação equipe"]);

    const dataAcaoKey = rowKeys.find(k => k.toLowerCase().includes('data ação') || k.toLowerCase().includes('data acao'));
    
    let dataAcaoDate: Date | null = null;
    if (dataAcaoKey && row[dataAcaoKey]) {
      dataAcaoDate = parseFullDateTime(row[dataAcaoKey]);
      if (dataAcaoDate) {
        horaAcao = dataAcaoDate.getUTCHours() + dataAcaoDate.getUTCMinutes() / 60 + dataAcaoDate.getUTCSeconds() / 3600;
      }
    }

    if (!dataAcaoDate) {
      dataAcaoDate = fullDataFim || fullDataInicio || new Date();
      if (fullDataInicio && fullDataFim && horaAcao !== null) {
        const startDay = new Date(Date.UTC(fullDataInicio.getUTCFullYear(), fullDataInicio.getUTCMonth(), fullDataInicio.getUTCDate()));
        const endDay = new Date(Date.UTC(fullDataFim.getUTCFullYear(), fullDataFim.getUTCMonth(), fullDataFim.getUTCDate()));
        
        let bestDate = startDay;
        let minDiff = Infinity;
        
        for (let d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1)) {
          const testDate = new Date(d);
          testDate.setUTCHours(Math.floor(horaAcao), Math.floor((horaAcao % 1) * 60), Math.floor(((horaAcao % 1) * 60 % 1) * 60));
          
          let diff = 0;
          if (testDate < fullDataInicio) diff = fullDataInicio.getTime() - testDate.getTime();
          else if (testDate > fullDataFim) diff = testDate.getTime() - fullDataFim.getTime();
          
          if (diff < minDiff) {
            minDiff = diff;
            bestDate = new Date(d);
          }
        }
        dataAcaoDate = bestDate;
      } else if (fullDataInicio && horaAcao !== null) {
        dataAcaoDate = new Date(Date.UTC(fullDataInicio.getUTCFullYear(), fullDataInicio.getUTCMonth(), fullDataInicio.getUTCDate()));
      }
    }

    row["Equipe Desl."] = String(row["Equipe Desl."] || "Não informado").trim();
    row["Turno"] = getTurnoFromEquipe(row["Equipe Desl."]);
    const shiftStartHour = getShiftStartHour(row["Turno"]);
    row.shiftStartHour = shiftStartHour;

    row["Data Ação"] = parseDate(dataAcaoDate);
    if (horaAcao !== null) {
      row["Data Turno"] = calculateShiftDate(dataAcaoDate, horaAcao, shiftStartHour);
      const h = Math.floor(horaAcao);
      const m = Math.floor((horaAcao % 1) * 60);
      const s = Math.floor((((horaAcao % 1) * 60) % 1) * 60);
      row["Hora da ação equipe"] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    let daysDiff = 0;
    if (dataFim && dataInicio) {
      const dFim = new Date(dataFim);
      const dIni = new Date(dataInicio);
      daysDiff = Math.round((dIni.getTime() - dFim.getTime()) / (1000 * 60 * 60 * 24));
    }

    row["TMD"] = Number(row["TMD"]) || 0;
    row["TME"] = Number(row["TME"]) || 0;
    row["TMDE"] = row["TMD"] + row["TME"];

    row["Grupo Processos DESLOC"] = String(
      row["Grupo Processos DESLOC"] || "Não informado",
    ).trim();
    row["Enel / Parceira DESLOC"] = String(
      row["Enel / Parceira DESLOC"] || "Não informado",
    ).trim();
    row["Polo"] = String(row["Polo"] || "Não informado").trim();

    row["Equipe Atribuída"] = String(row["Equipe Atribuída"] || "Não informado").trim();

    // Double-check Insourcing/Outsourcing using letter before hyphen in team name.
    // Letter "E" => ENEL, letter "P" => PARCEIRA. Letter overrides the column when conflicting.
    const equipeNomeCheck = String(row["Equipe Desl."] || row["Equipe Atribuída"] || "").trim().toUpperCase();
    const hyphenIdx = equipeNomeCheck.indexOf("-");
    if (hyphenIdx > 0) {
      const letterBeforeHyphen = equipeNomeCheck.charAt(hyphenIdx - 1);
      const colTipo = String(row["Enel / Parceira DESLOC"] || "").toUpperCase();
      if (letterBeforeHyphen === "E" && !colTipo.includes("ENEL")) {
        row["Enel / Parceira DESLOC"] = "ENEL";
      } else if (letterBeforeHyphen === "P" && !colTipo.includes("PARCEIRA")) {
        row["Enel / Parceira DESLOC"] = "PARCEIRA";
      }
    }
    row["Nº Cliente"] = String(row["Nº Cliente"] || "").trim();
    row["Observação"] = String(row["Observação"] || "");
    row["Número"] = String(row["Número"] || "");
    row["Causa"] = String(row["Causa"] || "");

    const causasImprodutivas = [
      "CASA FECHADA",
      "DEFEITO INTERNO CLIENTE",
      "ENDEREÇO NÃO LOCALIZADO",
      "ESTAVA NORMAL",
      "GRANDE CLIENTE DEFEITO INTERNO",
      "INCIDENCIA SEM AFETAÇÃO",
      "LUZ CORTADA",
      "NIVEL DE TENSÃO NORMAL",
      "OSCILAÇÃO",
      "OSCILAÇÃO PROVOCADA POR TERCEIROS",
      "OUTRAS CAUSAS DE TERCEIROS",
      "REGISTRO INDEVIDO DA RECLAMAÇÃO",
      "UC FECHADA",
    ];
    row["Improdutivo"] = causasImprodutivas.includes(
      row["Causa"].toUpperCase(),
    );

    const ord2Col = String(row["ORD 2"] || "")
      .toLowerCase()
      .includes("sim");
    const ord2Obs = /(ord|ordem|ordens)\s?0?2/i.test(row["Observação"]) || 
                    /(ord|ordem|ordens)\s?0?2/i.test(row["Obs"]) ||
                    /(ord|ordem|ordens)\s?0?2/i.test(row["OBSERVAÇÃO"]);
    row["ordem2"] = ord2Col || ord2Obs;

    row["hora_aux_ordenacao"] = horaAcao || 0;

    row["Processo"] = normalizarProcesso(row["Grupo Processos DESLOC"]);

    return row;
  });

  // Count displacements per incident number in the raw base
  const displacementCounts: Record<string, number> = {};
  inc.forEach((row: any) => {
    const num = String(row["Número"] || "").trim();
    const equipe = String(row["Equipe Desl."] || "").trim();
    // Count as displacement if it has a number and a team assigned
    if (num && equipe && equipe !== "" && equipe !== "Não informado" && equipe !== "---") {
      displacementCounts[num] = (displacementCounts[num] || 0) + 1;
    }
  });

  // Attach displacement count to filtered rows
  filteredInc = filteredInc.map((row: any) => ({
    ...row,
    qtdDeslocamentos: displacementCounts[row["Número"]] || 1
  }));

  // Sort for Reincidente
  filteredInc.sort((a, b) => {
    if (a["Nº Cliente"] !== b["Nº Cliente"])
      return a["Nº Cliente"].localeCompare(b["Nº Cliente"]);
    if (a["Data Ação"] !== b["Data Ação"])
      return (a["Data Ação"] || "").localeCompare(b["Data Ação"] || "");
    return a["hora_aux_ordenacao"] - b["hora_aux_ordenacao"];
  });

  for (let i = 0; i < filteredInc.length - 1; i++) {
    filteredInc[i]["Reincidente Causado"] =
      filteredInc[i]["Nº Cliente"] === filteredInc[i + 1]["Nº Cliente"] &&
      filteredInc[i]["Nº Cliente"] !== "";
  }
  if (filteredInc.length > 0) {
    filteredInc[filteredInc.length - 1]["Reincidente Causado"] = false;
  }

  // Process m300
  const m300Processed = m300.map((row: any) => {
    if (!row) return {};
    const rowKeys = Object.keys(row);
    const normalizeHeader = (key: string) => key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ºª]/g, (ch) => ch === 'º' ? 'o' : 'a')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const equipeKey = rowKeys.find(k => k.toLowerCase() === 'equipe') || "Equipe";
    row["Equipe"] = String(row[equipeKey] || "").trim();
    row["Turno"] = getTurnoFromEquipe(row["Equipe"]);
    const shiftStartHour = getShiftStartHour(row["Turno"]);
    row.shiftStartHour = shiftStartHour;

    const dataReferenciaKey = rowKeys.find(k => {
      const lower = normalizeHeader(k);
      return lower === 'data referencia' || /^data referencia_\d+$/.test(lower);
    });
    row["Data Referência"] = dataReferenciaKey ? parseDate(row[dataReferenciaKey]) : null;

    const inicioKey = rowKeys.find(k => k.toLowerCase().includes('inicio calendario')) || "Inicio Calendario";
    const dtInicioCal = parseFullDateTime(row[inicioKey]);
    if (dtInicioCal) {
      const hInicio = dtInicioCal.getUTCHours() + dtInicioCal.getUTCMinutes() / 60;
      row["Data Turno"] = calculateShiftDate(dtInicioCal, hInicio, shiftStartHour);
    } else {
      row["Data Turno"] = parseDate(row[inicioKey]);
    }
    row["Data M300"] = row["Data Referência"] || row["Data Turno"];

    // Find incident number column in m300
    const incNumKey = rowKeys.find(k => {
      const lower = k.toLowerCase().trim();
      return lower === 'incidente' || lower === 'número' || lower === 'numero' || lower === 'nº incidente' || lower === 'nº do incidente' || lower === 'nr_ordem' || lower === 'nr ordem' || lower === 'nr. ordem';
    });
    if (incNumKey) row["Incidente_M300"] = String(row[incNumKey] || "").trim();

    // Find time columns for Ordem 2 adjustment
    const aCaminhoKey = rowKeys.find(k => {
      const lower = k.toLowerCase().replace(/_/g, ' ').replace(/\./g, ' ').trim();
      return lower === 'a caminho' || lower === 'acaminho';
    });
    const noLocalKey = rowKeys.find(k => {
      const lower = k.toLowerCase().replace(/_/g, ' ').replace(/\./g, ' ').trim();
      return lower === 'no local' || lower === 'nolocal';
    });
    const liberadaKey = rowKeys.find(k => {
      const lower = k.toLowerCase().replace(/_/g, ' ').replace(/\./g, ' ').trim();
      return lower === 'liberada' || lower === 'liberado';
    });

    if (aCaminhoKey) row["A_Caminho"] = row[aCaminhoKey];
    if (noLocalKey) row["No_Local"] = row[noLocalKey];
    if (liberadaKey) row["Liberada"] = row[liberadaKey];

    // Determine actual incident date
    const dtACaminho = parseFullDateTime(row["A_Caminho"]);
    const dtNoLocal = parseFullDateTime(row["No_Local"]);
    const dtActual = dtACaminho || dtNoLocal;
    if (dtActual) {
      row["Data Ação Real"] = parseDate(dtActual);
    } else {
      row["Data Ação Real"] = row["Data Turno"];
    }

    // Keep corrected login as raw minutes, using the exact M300 column "1º Login Corrigido" (col 53)
    const exactLoginMinutesKey = rowKeys.find(k => {
      const lower = normalizeHeader(k);
      return lower === '1o login corrigido' || /^1o login corrigido_\d+$/.test(lower);
    });

    // Do NOT use column index fallback (rowKeys[52]) - JSON round-trips through
    // Supabase do not preserve key order, so positional access is unreliable.
    const loginMinutesKey = exactLoginMinutesKey;

    if (loginMinutesKey) {
      const loginMinutesVal = row[loginMinutesKey];
      row["1º Login Corrigido"] = loginMinutesVal;
      row["Log In Corrigido"] = loginMinutesVal;
    }

    const loginTimeKey = rowKeys.find(k => {
      const lower = normalizeHeader(k);
      return lower === 'log in' || lower === '1o login';
    });

    if (loginTimeKey) {
      const loginTimeVal = parseFullDateTime(row[loginTimeKey]);
      row["Log In"] = loginTimeVal;
      row["1º Login"] = loginTimeVal;
    }

    // 1º Despacho - separate column
    const despachoKey = rowKeys.find(k => {
      const lower = normalizeHeader(k);
      return lower === '1o despacho' || lower === '1º despacho';
    });
    if (despachoKey) {
      row["1º Despacho"] = row[despachoKey];
    }

    const deslocKey = rowKeys.find(k => {
      const lower = k.toLowerCase().trim();
      return lower === '1º desloc' || lower === '1o desloc' || lower === 'tempo de plataforma';
    });
    
    if (deslocKey) {
      row["1º Desloc"] = row[deslocKey];
    }

    const iniCalKey = rowKeys.find(k => k.toLowerCase().includes('inicio calendario') || k.toLowerCase().includes('início calendário'));
    if (iniCalKey) row["Inicio Calendario"] = parseFullDateTime(row[iniCalKey]);

    const fimCalKey = rowKeys.find(k => k.toLowerCase().includes('fim calendario') || k.toLowerCase().includes('fim calendário'));
    if (fimCalKey) row["Fim Calendario"] = parseFullDateTime(row[fimCalKey]);

    const iniIntKey = rowKeys.find(k => k.toLowerCase().includes('inicio intervalo') || k.toLowerCase().includes('início intervalo'));
    if (iniIntKey) row["Inicio Intervalo"] = parseFullDateTime(row[iniIntKey]);

    const fimIntKey = rowKeys.find(k => k.toLowerCase().includes('fim intervalo'));
    if (fimIntKey) row["Fim Intervalo"] = parseFullDateTime(row[fimIntKey]);

    const retBaseKey = rowKeys.find(k => k.toLowerCase().includes('retorno a base') || k.toLowerCase().includes('retorno à base'));
    if (retBaseKey) row["Retorno a base"] = row[retBaseKey];

    const logOffKey = rowKeys.find(k => {
      const lower = k.toLowerCase().trim();
      return lower === 'log off corrigido' || lower === 'log off' || lower === 'log-off';
    });
    if (logOffKey) {
      const logOffVal = parseFullDateTime(row[logOffKey]);
      row["Log Off"] = logOffVal;
      row["Log Off Corrigido"] = logOffVal;
    }

    const tempoPadraoKey = rowKeys.find(k => k.toLowerCase().includes('tempo padrao') || k.toLowerCase().includes('tempo padrão'));
    if (tempoPadraoKey) {
      const val = row[tempoPadraoKey];
      row["tempo_padrao"] = typeof val === 'number' ? val : parseFloat(String(val)) || 60;
    }

    const turnoKey = rowKeys.find(k => k.toLowerCase().includes('turno fechamento'));
    if (turnoKey) row["Turno fechamento"] = row[turnoKey];

    return row;
  });

  // Merge
  const finalData: any[] = [];
  const processedOrdem2 = new Set<string>();
  const processedHighTMDE = new Set<string>();
  
  const normalizeIncNum = (num: any): string => {
    if (num == null) return "";
    const s = String(num).trim();
    if (/^\d+$/.test(s)) return s.replace(/^0+/, "");
    return s;
  };

  // Group M300 by incident number for easier lookup
  const m300ByInc: Record<string, any[]> = {};
  m300Processed.forEach(m => {
    const incNumM300 = m["Incidente_M300"];
    if (incNumM300) {
      const key = normalizeIncNum(incNumM300);
      if (!m300ByInc[key]) m300ByInc[key] = [];
      m300ByInc[key].push(m);
    }
  });

  filteredInc.forEach((incRow: any) => {
    const incNum = incRow["Número"];
    const normalizedIncNum = normalizeIncNum(incNum);
    
    if (incRow["ordem2"]) {
      // Avoid duplicating Ordem 2 incidents if they appear multiple times in the incident file
      if (processedOrdem2.has(normalizedIncNum)) return;
      processedOrdem2.add(normalizedIncNum);

      const matches = m300ByInc[normalizedIncNum] || [];

      if (matches.length > 0) {
        // Find executor: latest "No_Local"
        let latestNoLocal: Date | null = null;
        let executorIndex = -1;

        const matchesWithDates = matches.map((m, idx) => {
          const noLocal = parseFullDateTime(m["No_Local"]);
          if (noLocal && (!latestNoLocal || noLocal.getTime() > latestNoLocal.getTime())) {
            latestNoLocal = noLocal;
            executorIndex = idx;
          }
          return { ...m, noLocalDate: noLocal };
        });

        // Fallback to latest Liberada if no No_Local found
        if (executorIndex === -1) {
          let latestLib: Date | null = null;
          matchesWithDates.forEach((m, idx) => {
            const lib = parseFullDateTime(m["Liberada"]);
            if (lib && (!latestLib || lib.getTime() > latestLib.getTime())) {
              latestLib = lib;
              executorIndex = idx;
            }
          });
        }
        
        if (executorIndex === -1) executorIndex = matches.length - 1;

        matchesWithDates.forEach((m, idx) => {
          const isExecutor = idx === executorIndex;
          
          // Helper to calculate minutes from M300 times
          const getMinutes = (start: any, end: any) => {
            if (start == null || end == null) return null;
            const dStart = parseFullDateTime(start);
            const dEnd = parseFullDateTime(end);
            if (dStart && dEnd) return Math.round((dEnd.getTime() - dStart.getTime()) / 60000);
            const hStart = horaParaDecimalSeguro(start);
            const hEnd = horaParaDecimalSeguro(end);
            if (hStart !== null && hEnd !== null) {
              let diff = hEnd - hStart;
              if (diff < 0) diff += 24;
              return Math.round(diff * 60);
            }
            return null;
          };

          const tmd = getMinutes(m["A_Caminho"], m["No_Local"]);
          const tme = getMinutes(m["No_Local"], m["Liberada"]);
          
          const otherTeams = matches.filter((_, i) => i !== idx).map(mt => mt["Equipe"]).join(", ");

          // Calculate hora_aux_ordenacao from "A Caminho" if available
          let horaAux = incRow["hora_aux_ordenacao"];
          const hACaminho = horaParaDecimalSeguro(m["A_Caminho"]);
          const hNoLocal = horaParaDecimalSeguro(m["No_Local"]);
          
          if (hACaminho !== null) {
            horaAux = hACaminho;
          } else if (hNoLocal !== null) {
            // If A Caminho is missing, estimate it from No Local and TMD
            const tmdVal = tmd !== null ? tmd : (Number(incRow["TMD"]) || 0);
            horaAux = hNoLocal - (tmdVal / 60);
            if (horaAux < 0) horaAux += 24;
          }

          const merged = { 
            ...incRow, 
            ...m,
            "Equipe Desl.": m["Equipe"], // Use the team from M300
            "Equipe Atribuída": otherTeams || incRow["Equipe Atribuída"],
            "Data Ação": m["Data Ação Real"] || incRow["Data Ação"], // Actual date of incident
            "Data Turno": m["Data Turno"] || incRow["Data Turno"] || incRow["Data Ação"], // Shift start date
            isExecutorO2: isExecutor,
            isIdentificadorO2: !isExecutor,
            isAtribuidaO2: !isExecutor,
            isDeslocadaO2: isExecutor,
            TMD: tmd !== null ? tmd : incRow["TMD"],
            TME: tme !== null ? tme : incRow["TME"],
            TMDE: (tmd !== null && tme !== null) ? (tmd + tme) : incRow["TMDE"],
            origTMD: incRow["TMD"],
            origTME: incRow["TME"],
            origTMDE: incRow["TMDE"],
            hora_aux_ordenacao: horaAux
          };

          finalData.push(merged);
        });
      } else {
        // No matches in M300 for this Ordem 2 incident, keep original
        finalData.push({
          ...incRow,
          "Turno fechamento": String(incRow["Turno fechamento"] || "Sem turno")
        });
      }
    } else if (incRow["TMDE"] > 150) {
      // Possible O2 or Anomaly logic
      if (processedHighTMDE.has(normalizedIncNum)) return;
      processedHighTMDE.add(normalizedIncNum);

      const matches = m300ByInc[normalizedIncNum] || [];

      if (matches.length > 1) {
        // Possible O2: multiple teams in M300
        let latestNoLocal: Date | null = null;
        let executorIndex = -1;

        const matchesWithDates = matches.map((m, idx) => {
          const noLocal = parseFullDateTime(m["No_Local"]);
          if (noLocal && (!latestNoLocal || noLocal.getTime() > latestNoLocal.getTime())) {
            latestNoLocal = noLocal;
            executorIndex = idx;
          }
          return { ...m, noLocalDate: noLocal };
        });

        if (executorIndex === -1) {
          let latestLib: Date | null = null;
          matchesWithDates.forEach((m, idx) => {
            const lib = parseFullDateTime(m["Liberada"]);
            if (lib && (!latestLib || lib.getTime() > latestLib.getTime())) {
              latestLib = lib;
              executorIndex = idx;
            }
          });
        }
        if (executorIndex === -1) executorIndex = matches.length - 1;

        matchesWithDates.forEach((m, idx) => {
          const isExecutor = idx === executorIndex;
          const getMinutes = (start: any, end: any) => {
            if (start == null || end == null) return null;
            const dStart = parseFullDateTime(start);
            const dEnd = parseFullDateTime(end);
            if (dStart && dEnd) return Math.round((dEnd.getTime() - dStart.getTime()) / 60000);
            return null;
          };

          const tmd = getMinutes(m["A_Caminho"], m["No_Local"]);
          const tme = getMinutes(m["No_Local"], m["Liberada"]);
          
          const otherTeams = matches.filter((_, i) => i !== idx).map(mt => mt["Equipe"]).join(", ");

          let horaAux = incRow["hora_aux_ordenacao"];
          const hACaminho = horaParaDecimalSeguro(m["A_Caminho"]);
          if (hACaminho !== null) horaAux = hACaminho;

          finalData.push({
            ...incRow,
            ...m,
            "Equipe Desl.": m["Equipe"],
            "Equipe Atribuída": otherTeams || incRow["Equipe Atribuída"],
            "Data Ação": m["Data Ação Real"] || incRow["Data Ação"],
            "Data Turno": m["Data Turno"] || incRow["Data Turno"] || incRow["Data Ação"],
            possivelO2: true,
            isAtribuidaO2: !isExecutor,
            isDeslocadaO2: isExecutor,
            isExecutorO2: isExecutor,
            TMD: tmd !== null ? tmd : incRow["TMD"],
            TME: tme !== null ? tme : 0,
            TMDE: (tmd !== null || tme !== null) ? ((tmd || 0) + (tme || 0)) : incRow["TMDE"],
            origTMD: incRow["TMD"],
            origTME: incRow["TME"],
            origTMDE: incRow["TMDE"],
            hora_aux_ordenacao: horaAux
          });
        });
      } else if (matches.length === 1) {
        // Possible Anomaly: single team in M300
        const m = matches[0];
        const getMinutes = (start: any, end: any) => {
          if (start == null || end == null) return null;
          const dStart = parseFullDateTime(start);
          const dEnd = parseFullDateTime(end);
          if (dStart && dEnd) return Math.round((dEnd.getTime() - dStart.getTime()) / 60000);
          return null;
        };

        const tmd = getMinutes(m["A_Caminho"], m["No_Local"]);
        const tme = getMinutes(m["No_Local"], m["Liberada"]);
        
        let horaAux = incRow["hora_aux_ordenacao"];
        const hACaminho = horaParaDecimalSeguro(m["A_Caminho"]);
        if (hACaminho !== null) horaAux = hACaminho;

        finalData.push({
          ...incRow,
          ...m,
          "Data Ação": m["Data Ação Real"] || incRow["Data Ação"],
          "Data Turno": m["Data Turno"] || incRow["Data Ação"],
          possivelAnomalia: true,
          TMD: tmd !== null ? tmd : incRow["TMD"],
          TME: tme !== null ? tme : 0,
          TMDE: (tmd !== null || tme !== null) ? ((tmd || 0) + (tme || 0)) : incRow["TMDE"],
          origTMD: incRow["TMD"],
          origTME: incRow["TME"],
          origTMDE: incRow["TMDE"],
          hora_aux_ordenacao: horaAux
        });
      } else {
        // No matches in M300, keep original
        finalData.push({
          ...incRow,
          origTMD: incRow["TMD"],
          origTME: incRow["TME"],
          origTMDE: incRow["TMDE"]
        });
      }
    } else {
      // Non-Ordem 2: current logic
      const matches = m300ByInc[normalizedIncNum] || [];
      let match = matches.find(m => m["Equipe"] === incRow["Equipe Desl."]);
      
      if (!match) {
        match = m300Processed.find(
          (mRow: any) =>
            mRow["Equipe"] && mRow["Data M300"] &&
            mRow["Equipe"] === incRow["Equipe Desl."] &&
            mRow["Data M300"] === (incRow["Data Turno"] || incRow["Data Ação"]),
        );
      }

      const merged = { 
        ...incRow, 
        ...match,
        "Data Turno": match ? match["Data Turno"] : incRow["Data Ação"],
        origTMD: incRow["TMD"],
        origTME: incRow["TME"],
        origTMDE: incRow["TMDE"]
      };

      const tme = merged["TME"];
      const tmd = merged["TMD"];
      if (tme != null && typeof tme === 'number' && tmd != null && typeof tmd === 'number') {
        merged["TMDE"] = tme + tmd;
      }

      // Post-merge anomaly detection: if TMDE > 150 after merge, flag accordingly
      const finalTmde = Number(merged["TMDE"]) || 0;
      if (finalTmde > 150 && !merged.possivelAnomalia && !merged.possivelO2) {
        merged.possivelAnomalia = true;
        merged.origTMD = incRow["TMD"];
        merged.origTME = incRow["TME"];
        merged.origTMDE = incRow["TMDE"];
      }

      merged["Turno fechamento"] = String(
        merged["Turno fechamento"] || "Sem turno",
      );
      finalData.push(merged);
    }
  });

  // Add M300-only incidents (in M300 for team/day but not in incidents base)
  const finalIncKeys = new Set<string>();
  const getDateKey = (row: any): string => {
    return String(
      row?.["Data Referência"] ||
      row?.["Data M300"] ||
      row?.["Data Turno"] ||
      row?.["Data Ação"] ||
      "",
    );
  };

  finalData.forEach(d => {
    const num = normalizeIncNum(d["Número"] || d["Incidente_M300"]);
    const equipe = d["Equipe Desl."] || d["Equipe"];
    const dateKey = getDateKey(d);
    if (num && equipe && dateKey) finalIncKeys.add(`${num}|${equipe}|${dateKey}`);
  });

  console.log("[M300-only] finalData antes:", finalData.length, "| m300Processed:", m300Processed.length, "| finalIncKeys:", finalIncKeys.size);
  let m300OnlyCount = 0;
  let m300SkipNoInc = 0;
  let m300SkipDup = 0;
  let m300SkipNoHora = 0;

  m300Processed.forEach((m: any) => {
    const incNum = normalizeIncNum(m["Incidente_M300"]);
    const equipe = m["Equipe"];
    const date = m["Data Referência"] || m["Data M300"] || m["Data Turno"];
    if (!incNum || !equipe || !date) {
      m300SkipNoInc++;
      return;
    }

    const key = `${incNum}|${equipe}|${date}`;
    if (finalIncKeys.has(key)) {
      m300SkipDup++;
      return;
    }

    const getMinutesLocal = (start: any, end: any) => {
      if (start == null || end == null) return null;
      const dStart = parseFullDateTime(start);
      const dEnd = parseFullDateTime(end);
      if (dStart && dEnd) return Math.round((dEnd.getTime() - dStart.getTime()) / 60000);
      const hStart = horaParaDecimalSeguro(start);
      const hEnd = horaParaDecimalSeguro(end);
      if (hStart !== null && hEnd !== null) {
        let diff = hEnd - hStart;
        if (diff < 0) diff += 24;
        return Math.round(diff * 60);
      }
      return null;
    };

    const tmd = getMinutesLocal(m["A_Caminho"], m["No_Local"]) || 0;
    const tme = getMinutesLocal(m["No_Local"], m["Liberada"]) || 0;

    const hACaminho = horaParaDecimalSeguro(m["A_Caminho"]);
    const hNoLocal = horaParaDecimalSeguro(m["No_Local"]);
    let horaAux = hACaminho;
    if (horaAux === null && hNoLocal !== null) {
      horaAux = hNoLocal - (tmd / 60);
      if (horaAux < 0) horaAux += 24;
    }
    if (horaAux === null) {
      m300SkipNoHora++;
      return;
    }

    const dtACaminhoM300 = parseFullDateTime(m["A_Caminho"]);
    const dtNoLocalM300 = parseFullDateTime(m["No_Local"]);
    const dtActualIncident = dtACaminhoM300 || dtNoLocalM300;

    const causa = String(m["CAUSA"] || m["Causa"] || "");
    const causasImprodutivas = [
      "CASA FECHADA", "DEFEITO INTERNO CLIENTE", "ENDEREÇO NÃO LOCALIZADO",
      "ESTAVA NORMAL", "GRANDE CLIENTE DEFEITO INTERNO", "INCIDENCIA SEM AFETAÇÃO",
      "LUZ CORTADA", "NIVEL DE TENSÃO NORMAL", "OSCILAÇÃO",
      "OSCILAÇÃO PROVOCADA POR TERCEIROS", "OUTRAS CAUSAS DE TERCEIROS",
      "REGISTRO INDEVIDO DA RECLAMAÇÃO", "UC FECHADA",
    ];

    m300OnlyCount++;
    finalData.push({
      ...m,
      "Equipe Desl.": equipe,
      "Número": m["Incidente_M300"] || incNum,
      "Data Turno": date,
      "Data Ação": m["Data Ação Real"] || date,
      "Data M300": date,
      "Data Referência": date,
      "Processo": normalizarProcesso(m["Grupo Processos DESLOC"] || "Outros"),
      "Grupo Processos DESLOC": m["Grupo Processos DESLOC"] || "Não informado",
      "Enel / Parceira DESLOC": m["Enel / Parceira DESLOC"] || "Não informado",
      "Polo": m["Polo"] || "Não informado",
      "Causa": causa,
      "Improdutivo": causasImprodutivas.includes(causa.toUpperCase()),
      "ordem2": false,
      "Reincidente Causado": false,
      TMD: tmd,
      TME: tme,
      TMDE: tmd + tme,
      hora_aux_ordenacao: horaAux,
      isM300Only: true,
      shiftStartHour: m.shiftStartHour,
      Turno: m.Turno,
    });

    finalIncKeys.add(key);
  });

  console.log("[M300-only] Adicionados:", m300OnlyCount, "| Sem incNum/equipe/date:", m300SkipNoInc, "| Duplicados:", m300SkipDup, "| Sem hora:", m300SkipNoHora, "| finalData total:", finalData.length);

  return finalData;
}

export async function processFiles(incFile: File, m300File: File | null) {
  const [incRaw, m300Raw] = await Promise.all([
    readExcelToJson(incFile),
    m300File ? readExcelToJson(m300File) : Promise.resolve([]),
  ]);
  return processRawData(incRaw, m300Raw);
}
