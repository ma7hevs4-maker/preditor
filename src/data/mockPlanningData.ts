// Mock data based on the Python script output structure
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

export interface ConfigData {
  base: string;
  backlog_bt: number;
  backlog_mt: number;
  equipes_bt: { A: number; B: number; C: number };
  equipes_mt: { A: number; B: number; C: number };
  prod_bt: number;
  prod_mt: number;
}

export const configData: ConfigData = {
  base: "Niterói - Verão",
  backlog_bt: 29,
  backlog_mt: 1,
  equipes_bt: { A: 6, B: 10, C: 7 },
  equipes_mt: { A: 3, B: 4, C: 2 },
  prod_bt: 2.81,
  prod_mt: 1.47,
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

// Generate mock hourly data starting from current hour
export const generateMockData = (startHour: number = new Date().getHours()): HourlyData[] => {
  const data: HourlyData[] = [];
  let backlog_bt = configData.backlog_bt;
  let backlog_mt = configData.backlog_mt;

  for (let i = 0; i < 24 - startHour; i++) {
    const hora = startHour + i;
    const turno = getTurno(hora);
    
    // Simulate weather (with some rain in afternoon)
    const precip_mm = hora >= 14 && hora <= 18 ? Math.random() * 3 : Math.random() * 0.5;
    const wind_ms = 2 + Math.random() * 4;
    const temp_c = 24 + Math.random() * 8;

    // Apply rain uplift
    const rainUplift = precip_mm > 1 ? 0.52 : precip_mm > 0.2 ? 0.28 : 0;
    
    const entrada_bt_adj = ENTRADA_BT[hora] * (1 + rainUplift);
    const entrada_mt_adj = ENTRADA_MT[hora] * (1 + rainUplift * 1.5);
    
    const ret_op_bt = entrada_bt_adj * (RETIRADA_BT_PCT[hora] / 100);
    const ret_op_mt = entrada_mt_adj * (RETIRADA_MT_PCT[hora] / 100);
    
    const eq_bt_disp = configData.equipes_bt[turno];
    const eq_mt_disp = configData.equipes_mt[turno];
    
    const cap_bt_h_disp = Math.ceil(eq_bt_disp * (configData.prod_bt / 8));
    const cap_mt_h_disp = Math.ceil(eq_mt_disp * (configData.prod_mt / 8));
    
    // Calculate saldo
    const saldo_bt_disp = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_h_disp);
    const saldo_mt_disp = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_h_disp);
    
    // Additional teams needed for ideal scenario
    const eq_bt_add_dist = saldo_bt_disp > 5 ? Math.ceil(saldo_bt_disp / 3) : 0;
    const eq_mt_add_dist = saldo_mt_disp > 2 ? Math.ceil(saldo_mt_disp / 2) : 0;
    
    const saldo_bt_ideal = Math.max(0, saldo_bt_disp - eq_bt_add_dist * cap_bt_h_disp / eq_bt_disp);
    const saldo_mt_ideal = Math.max(0, saldo_mt_disp - eq_mt_add_dist * cap_mt_h_disp / eq_mt_disp);

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

export const mockHourlyData = generateMockData();
