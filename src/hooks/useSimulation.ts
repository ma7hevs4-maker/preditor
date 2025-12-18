import { useMemo } from "react";
import { HistoricalDataRow } from "./useHistoricalData";
import { WeatherHour } from "./useWeather";
import { SystemSetting } from "./useSystemSettings";

export interface SimulationConfig {
  baseId: string;
  btInitialBacklog: number;
  mtInitialBacklog: number;
  teamsPerHour: number[]; // 24 values for day 1
  lossTeamsPerHour: number[]; // 24 values - equipes de perdas (só BT) day 1
  teamsPerHourDay2: number[]; // 24 values for day 2
  lossTeamsPerHourDay2: number[]; // 24 values - equipes de perdas day 2
  teamsPerHourDay3: number[]; // 24 values for day 3
  lossTeamsPerHourDay3: number[]; // 24 values - equipes de perdas day 3
  horizonHours: number;
}

export interface SimulationRow {
  hora: number;
  dia: number; // 0 = today, 1 = tomorrow, etc
  datetime: string;
  // BT
  entrada_bt_adj: number;
  ret_op_bt: number;
  eq_disp: number;
  cap_bt_h: number;
  incidentes_bt_saldo: number;
  eq_bt_add: number;
  // MT
  entrada_mt_adj: number;
  ret_op_mt: number;
  cap_mt_h: number;
  incidentes_mt_saldo: number;
  eq_mt_add: number;
  // Weather
  precip_mm: number;
  wind_ms: number;
  temp_c: number;
  weather_description: string;
  // Detailed data
  uplift_bt_pct: number;
  uplift_mt_pct: number;
  eq_bt: number; // equipes alocadas a BT
  eq_mt: number; // equipes alocadas a MT
  eq_perdas: number; // equipes de perdas
  entrada_bt_base: number; // entrada histórica sem uplift
  entrada_mt_base: number;
  bt_productivity: number;
  mt_productivity: number;
  saldo_bt_ideal: number; // saldo se usar equipes ideais
  saldo_mt_ideal: number;
  eq_ideal_total: number; // total de equipes ideal
  remoto_bt_retirado: number; // quantidade retirada pelo remoto nesta hora
}

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

const getUplift = (precip: number, type: "bt" | "mt"): number => {
  const faixa = getFaixaChuva(precip);
  if (faixa === "seco") return 0;
  const table = type === "bt" ? UPLIFT_CHUVA.bt_total : UPLIFT_CHUVA.mt_total;
  return (table[faixa as keyof typeof table] || 0) / 100;
};

export const useSimulation = (
  config: SimulationConfig,
  historicalData: HistoricalDataRow[] | undefined,
  weatherData: WeatherHour[] | undefined,
  systemSettings?: SystemSetting[]
) => {
  return useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    // Get system settings values
    const getSettingValue = (key: string, defaultValue: number): number => {
      const setting = systemSettings?.find(s => s.key === key);
      return setting ? parseFloat(setting.value) : defaultValue;
    };

    const remotoPercent = getSettingValue("operator_removal_percent", 10) / 100; // ex: 10% -> 0.1
    const TARGET_BT = getSettingValue("bt_target", 70);
    const TARGET_MT = getSettingValue("mt_target", 10);

    const result: SimulationRow[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // Backlog inicial (sem redução prévia - agora aplicamos por hora)
    let backlog_bt = config.btInitialBacklog;
    let backlog_mt = config.mtInitialBacklog;

    for (let i = 0; i < config.horizonHours; i++) {
      const hora = (currentHour + i) % 24;
      const dia = Math.floor((currentHour + i) / 24);
      
      const targetDate = new Date(now);
      targetDate.setHours(currentHour + i, 0, 0, 0);

      // Nas primeiras 8 horas, retirar a % de remoto do backlog BT ANTES do cálculo
      let remoto_bt_retirado = 0;
      if (i < 8) {
        remoto_bt_retirado = backlog_bt * remotoPercent;
        backlog_bt = backlog_bt - remoto_bt_retirado;
      }

      // Get historical data for this hour
      const historical = historicalData.find((h) => h.hour === hora) || {
        bt_productivity: 1,
        bt_entry_rate: 10,
        bt_operator_removal: 0.5,
        mt_productivity: 0.8,
        mt_entry_rate: 5,
        mt_operator_removal: 0.2,
      };

      // Get weather for this hour
      const weather = weatherData?.[i] || {
        precip_mm: 0,
        wind_ms: 3,
        temp_c: 25,
        description: "",
      };

      // Apply rain uplift to entry rates
      const uplift_bt = getUplift(weather.precip_mm, "bt");
      const uplift_mt = getUplift(weather.precip_mm, "mt");

      // Entrada ajustada = entrada histórica * (1 + uplift do clima)
      const entrada_bt_adj = historical.bt_entry_rate * (1 + uplift_bt);
      const entrada_mt_adj = historical.mt_entry_rate * (1 + uplift_mt);

      // Retirada de operador = entrada histórica * percentual de retirada
      const ret_op_bt = historical.bt_entry_rate * historical.bt_operator_removal;
      const ret_op_mt = historical.mt_entry_rate * historical.mt_operator_removal;

      // Total de equipes disponíveis nesta hora (usa dia correto)
      let eq_disp = 0;
      let eq_perdas = 0;
      if (dia === 0) {
        eq_disp = config.teamsPerHour[hora] || 0;
        eq_perdas = config.lossTeamsPerHour?.[hora] || 0;
      } else if (dia === 1) {
        eq_disp = config.teamsPerHourDay2?.[hora] ?? config.teamsPerHour[hora] ?? 0;
        eq_perdas = config.lossTeamsPerHourDay2?.[hora] ?? config.lossTeamsPerHour?.[hora] ?? 0;
      } else {
        eq_disp = config.teamsPerHourDay3?.[hora] ?? config.teamsPerHour[hora] ?? 0;
        eq_perdas = config.lossTeamsPerHourDay3?.[hora] ?? config.lossTeamsPerHour?.[hora] ?? 0;
      }

      // Alocação de equipes: MT primeiro (mais importante), resto para BT
      // Equipes necessárias para MT = backlog_mt atual (1 equipe por incidente, no máximo)
      const eq_mt = Math.min(eq_disp, Math.ceil(backlog_mt + entrada_mt_adj - ret_op_mt));
      const eq_bt = Math.max(0, eq_disp - eq_mt);

      // Capacidade de retirada = (produtividade / 8) * equipes alocadas
      // Equipes de perdas só contribuem para BT
      const cap_bt_h = (historical.bt_productivity / 8) * (eq_bt + eq_perdas);
      const cap_mt_h = (historical.mt_productivity / 8) * eq_mt;

      // Cálculo do backlog:
      // novo_backlog = backlog_atual + entrada_ajustada - retirada_operador - capacidade_equipes
      const saldo_bt = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_h);
      const saldo_mt = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_h);

      // Capacidade por equipe por hora
      const cap_por_eq_bt = historical.bt_productivity / 8;
      const cap_por_eq_mt = historical.mt_productivity / 8;

      // Horas restantes até o final do horizonte
      const horasRestantes = config.horizonHours - i;
      
      // Gap entre saldo atual e meta
      const gap_bt = saldo_bt - TARGET_BT;
      const gap_mt = saldo_mt - TARGET_MT;
      
      // Equipes adicionais POR HORA necessárias para atingir a meta ao final do horizonte
      // Distribuindo o gap ao longo das horas restantes
      const eq_bt_add = gap_bt > 0 && horasRestantes > 0
        ? Math.ceil(gap_bt / (horasRestantes * Math.max(cap_por_eq_bt, 0.1)))
        : 0;
      const eq_mt_add = gap_mt > 0 && horasRestantes > 0
        ? Math.ceil(gap_mt / (horasRestantes * Math.max(cap_por_eq_mt, 0.1)))
        : 0;

      // Cálculo de equipes ideais para esta hora atingir meta gradualmente
      const eq_ideal_bt = gap_bt > 0 && cap_por_eq_bt > 0 
        ? Math.ceil(gap_bt / (horasRestantes * cap_por_eq_bt))
        : 0;
      const eq_ideal_mt = gap_mt > 0 && cap_por_eq_mt > 0 
        ? Math.ceil(gap_mt / (horasRestantes * cap_por_eq_mt))
        : 0;
      const eq_ideal_total = eq_ideal_bt + eq_ideal_mt + eq_bt + eq_mt;

      // Saldo com equipes ideais
      const cap_bt_ideal = cap_por_eq_bt * (eq_bt + eq_ideal_bt + eq_perdas);
      const cap_mt_ideal = cap_por_eq_mt * (eq_mt + eq_ideal_mt);
      const saldo_bt_ideal = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_ideal);
      const saldo_mt_ideal = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_ideal);

      result.push({
        hora,
        dia,
        datetime: targetDate.toISOString(),
        entrada_bt_adj: Math.round(entrada_bt_adj * 100) / 100,
        ret_op_bt: Math.round(ret_op_bt * 100) / 100,
        eq_disp,
        cap_bt_h: Math.round(cap_bt_h * 100) / 100,
        incidentes_bt_saldo: Math.round(saldo_bt),
        eq_bt_add,
        entrada_mt_adj: Math.round(entrada_mt_adj * 100) / 100,
        ret_op_mt: Math.round(ret_op_mt * 100) / 100,
        cap_mt_h: Math.round(cap_mt_h * 100) / 100,
        incidentes_mt_saldo: Math.round(saldo_mt),
        eq_mt_add,
        precip_mm: weather.precip_mm,
        wind_ms: weather.wind_ms,
        temp_c: weather.temp_c,
        weather_description: weather.description || "",
        // Detailed data
        uplift_bt_pct: uplift_bt * 100,
        uplift_mt_pct: uplift_mt * 100,
        eq_bt,
        eq_mt,
        eq_perdas,
        entrada_bt_base: historical.bt_entry_rate,
        entrada_mt_base: historical.mt_entry_rate,
        bt_productivity: historical.bt_productivity,
        mt_productivity: historical.mt_productivity,
        saldo_bt_ideal,
        saldo_mt_ideal,
        eq_ideal_total,
        remoto_bt_retirado: Math.round(remoto_bt_retirado * 100) / 100,
      });

      // Atualiza backlog para próxima iteração
      backlog_bt = saldo_bt;
      backlog_mt = saldo_mt;
    }

    return result;
  }, [config, historicalData, weatherData, systemSettings]);
};
