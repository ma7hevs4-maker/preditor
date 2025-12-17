import { useMemo } from "react";
import { HistoricalDataRow } from "./useHistoricalData";
import { WeatherHour } from "./useWeather";

export interface SimulationConfig {
  baseId: string;
  btInitialBacklog: number;
  mtInitialBacklog: number;
  teamsPerHour: number[]; // 24 values for each hour
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
  weatherData: WeatherHour[] | undefined
) => {
  return useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [];
    }

    const result: SimulationRow[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    let backlog_bt = config.btInitialBacklog;
    let backlog_mt = config.mtInitialBacklog;

    for (let i = 0; i < config.horizonHours; i++) {
      const hora = (currentHour + i) % 24;
      const dia = Math.floor((currentHour + i) / 24);
      
      const targetDate = new Date(now);
      targetDate.setHours(currentHour + i, 0, 0, 0);

      // Get historical data for this hour
      const historical = historicalData.find((h) => h.hour === hora) || {
        bt_productivity: 1,
        bt_entry_rate: 10,
        bt_operator_removal: 1,
        mt_productivity: 0.8,
        mt_entry_rate: 5,
        mt_operator_removal: 0.5,
      };

      // Get weather for this hour
      const weather = weatherData?.[i] || {
        precip_mm: 0,
        wind_ms: 3,
        temp_c: 25,
        description: "",
      };

      // Apply rain uplift
      const uplift_bt = getUplift(weather.precip_mm, "bt");
      const uplift_mt = getUplift(weather.precip_mm, "mt");

      const entrada_bt_adj = historical.bt_entry_rate * (1 + uplift_bt);
      const entrada_mt_adj = historical.mt_entry_rate * (1 + uplift_mt);

      const ret_op_bt = historical.bt_operator_removal;
      const ret_op_mt = historical.mt_operator_removal;

      const eq_disp = config.teamsPerHour[hora] || 0;

      // Capacity per hour = productivity * teams
      const cap_bt_h = eq_disp * historical.bt_productivity;
      const cap_mt_h = eq_disp * historical.mt_productivity;

      // Calculate saldo (balance)
      const saldo_bt = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_h);
      const saldo_mt = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_h);

      // Additional teams needed
      const eq_bt_add = saldo_bt > 0 ? Math.ceil(saldo_bt / Math.max(historical.bt_productivity, 0.1)) : 0;
      const eq_mt_add = saldo_mt > 0 ? Math.ceil(saldo_mt / Math.max(historical.mt_productivity, 0.1)) : 0;

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
      });

      // Update backlog for next iteration
      backlog_bt = saldo_bt;
      backlog_mt = saldo_mt;
    }

    return result;
  }, [config, historicalData, weatherData]);
};
