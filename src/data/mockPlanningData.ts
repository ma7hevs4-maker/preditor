// Data types based on the Python script
export interface HourlyData {
  hora: number;
  turno: 'A' | 'B' | 'C';
  // BT (Baixa Tensão)
  entrada_bt_adj: number;
  ret_op_bt: number;
  eq_bt_disp: number;
  cap_bt_h_disp: number;
  eq_bt_add_dist: number;
  incidentes_bt_saldo_disp: number;
  incidentes_bt_saldo_ideal: number;
  // MT (Média Tensão)
  entrada_mt_adj: number;
  ret_op_mt: number;
  eq_mt_disp: number;
  cap_mt_h_disp: number;
  eq_mt_add_dist: number;
  incidentes_mt_saldo_disp: number;
  incidentes_mt_saldo_ideal: number;
  // Weather
  precip_mm: number;
  wind_ms: number;
  temp_c: number;
}

export interface BaseConfig {
  id: string;
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface PlanningConfig {
  base: string;
  backlog_bt: number;
  backlog_mt: number;
  equipes_bt: { A: number; B: number; C: number };
  equipes_mt: { A: number; B: number; C: number };
  prod_bt: number;
  prod_mt: number;
  remote_share: number;
  chuva_threshold: number;
}

// Available bases from Python script
export const BASES: BaseConfig[] = [
  { id: "Niteroi_Verao", name: "Niterói - Verão", lat: -22.883, lon: -43.103, timezone: "America/Sao_Paulo" },
  { id: "Niteroi_Inverno", name: "Niterói - Inverno", lat: -22.883, lon: -43.103, timezone: "America/Sao_Paulo" },
  { id: "Rio_Centro", name: "Rio - Centro", lat: -22.906, lon: -43.172, timezone: "America/Sao_Paulo" },
  { id: "Rio_Zona_Sul", name: "Rio - Zona Sul", lat: -22.983, lon: -43.198, timezone: "America/Sao_Paulo" },
  { id: "Baixada", name: "Baixada Fluminense", lat: -22.757, lon: -43.310, timezone: "America/Sao_Paulo" },
];

// Default configuration
export const defaultConfig: PlanningConfig = {
  base: "Niteroi_Verao",
  backlog_bt: 29,
  backlog_mt: 1,
  equipes_bt: { A: 6, B: 10, C: 7 },
  equipes_mt: { A: 3, B: 4, C: 2 },
  prod_bt: 2.81,
  prod_mt: 1.47,
  remote_share: 0.30,
  chuva_threshold: 0.2,
};

const getTurno = (hora: number): 'A' | 'B' | 'C' => {
  if (hora >= 0 && hora <= 7) return 'A';
  if (hora >= 8 && hora <= 15) return 'B';
  return 'C';
};

// Historical curves from Python script
const ENTRADA_BT = [7, 5, 4, 3, 3, 5, 10, 16, 27, 31, 31, 28, 25, 24, 25, 26, 27, 28, 28, 25, 23, 22, 16, 11];
const ENTRADA_MT = [1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 2, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 2];
const RETIRADA_BT_PCT = [72, 70, 67, 62, 71, 68, 67, 66, 69, 72, 74, 78, 77, 76, 77, 79, 81, 82, 81, 79, 83, 82, 77, 79];
const RETIRADA_MT_PCT = [21, 19, 22, 15, 16, 16, 10, 14, 26, 29, 27, 23, 23, 28, 23, 29, 17, 19, 21, 23, 22, 21, 17, 11];

// Uplift tables from Python
const UPLIFT_CHUVA = {
  bt_total: { "0.2-1": 28.0, "1-5": 52.13, "5-10": 79.90, "gt10": 141.46 },
  mt_total: { "0.2-1": 40.0, "1-5": 104.12, "5-10": 97.33, "gt10": 265.33 },
};

const getFaixaChuva = (mm: number): string => {
  if (mm < 0.2) return "seco";
  if (mm < 1.0) return "0.2-1";
  if (mm < 5.0) return "1-5";
  if (mm < 10.0) return "5-10";
  return "gt10";
};

const getUplift = (precip: number, type: 'bt' | 'mt'): number => {
  const faixa = getFaixaChuva(precip);
  if (faixa === "seco") return 0;
  const table = type === 'bt' ? UPLIFT_CHUVA.bt_total : UPLIFT_CHUVA.mt_total;
  return (table[faixa as keyof typeof table] || 0) / 100;
};

// Generate planning data based on configuration
export const generatePlanningData = (config: PlanningConfig, startHour: number = new Date().getHours()): HourlyData[] => {
  const data: HourlyData[] = [];
  let backlog_bt = config.backlog_bt;
  let backlog_mt = config.backlog_mt;

  for (let i = 0; i < 24 - startHour; i++) {
    const hora = startHour + i;
    const turno = getTurno(hora);
    
    // Simulate weather (with some rain in afternoon)
    const precip_mm = hora >= 14 && hora <= 18 ? Math.random() * 3 : Math.random() * 0.5;
    const wind_ms = 2 + Math.random() * 4;
    const temp_c = 24 + Math.random() * 8;

    // Apply rain uplift based on Python logic
    const uplift_bt = getUplift(precip_mm, 'bt');
    const uplift_mt = getUplift(precip_mm, 'mt');
    
    const entrada_bt_adj = ENTRADA_BT[hora] * (1 + uplift_bt);
    const entrada_mt_adj = ENTRADA_MT[hora] * (1 + uplift_mt);
    
    const ret_op_bt = entrada_bt_adj * (RETIRADA_BT_PCT[hora] / 100);
    const ret_op_mt = entrada_mt_adj * (RETIRADA_MT_PCT[hora] / 100);
    
    const eq_bt_disp = config.equipes_bt[turno];
    const eq_mt_disp = config.equipes_mt[turno];
    
    // Capacity per hour = (prod/8) * teams, rounded up
    const cap_bt_h_disp = Math.ceil(eq_bt_disp * (config.prod_bt / 8));
    const cap_mt_h_disp = Math.ceil(eq_mt_disp * (config.prod_mt / 8));
    
    // Calculate saldo (balance)
    const saldo_bt_disp = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_h_disp);
    const saldo_mt_disp = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_h_disp);
    
    // Additional teams needed for ideal scenario
    const cap_unit_bt = (config.prod_bt / 8);
    const cap_unit_mt = (config.prod_mt / 8);
    const eq_bt_add_dist = saldo_bt_disp > 0 ? Math.ceil(saldo_bt_disp / Math.max(cap_unit_bt, 0.1)) : 0;
    const eq_mt_add_dist = saldo_mt_disp > 0 ? Math.ceil(saldo_mt_disp / Math.max(cap_unit_mt, 0.1)) : 0;
    
    const saldo_bt_ideal = Math.max(0, saldo_bt_disp - eq_bt_add_dist * cap_unit_bt);
    const saldo_mt_ideal = Math.max(0, saldo_mt_disp - eq_mt_add_dist * cap_unit_mt);

    data.push({
      hora,
      turno,
      entrada_bt_adj: Math.round(entrada_bt_adj * 100) / 100,
      ret_op_bt: Math.round(ret_op_bt * 100) / 100,
      eq_bt_disp,
      cap_bt_h_disp,
      eq_bt_add_dist,
      incidentes_bt_saldo_disp: Math.round(saldo_bt_disp),
      incidentes_bt_saldo_ideal: Math.round(saldo_bt_ideal),
      entrada_mt_adj: Math.round(entrada_mt_adj * 100) / 100,
      ret_op_mt: Math.round(ret_op_mt * 100) / 100,
      eq_mt_disp,
      cap_mt_h_disp,
      eq_mt_add_dist,
      incidentes_mt_saldo_disp: Math.round(saldo_mt_disp),
      incidentes_mt_saldo_ideal: Math.round(saldo_mt_ideal),
      precip_mm: Math.round(precip_mm * 100) / 100,
      wind_ms: Math.round(wind_ms * 10) / 10,
      temp_c: Math.round(temp_c * 10) / 10,
    });

    backlog_bt = saldo_bt_disp;
    backlog_mt = saldo_mt_disp;
  }

  return data;
};
