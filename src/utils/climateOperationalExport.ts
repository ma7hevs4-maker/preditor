import type { HistoricalDataRow } from "@/hooks/useHistoricalData";
import type { WeatherHour } from "@/hooks/useWeather";
import type { WeatherTrigger } from "@/hooks/useWeatherTriggers";

export const VOLUME_KEYS = [
  "totalBtEntry", "totalMtEntry", "totalBtEntryAdj", "totalMtEntryAdj",
  "totalBtOpRemoval", "totalMtOpRemoval", "totalBtOpRemovalAdj", "totalMtOpRemovalAdj",
  "btEntryForTeam", "mtEntryForTeam", "btEntryForTeamAdj", "mtEntryForTeamAdj",
] as const;
type Volumes = Record<typeof VOLUME_KEYS[number], number>;
export type OperationalMetrics = Volumes & { teamsNeeded: number; teamsNeededAdj: number; hasUplift: boolean };
export type OperationalHour = OperationalMetrics & { hour: number };

export function sumOperationalMetrics(rows: Volumes[]): OperationalMetrics {
  const totals = Object.fromEntries(VOLUME_KEYS.map(key => [key, rows.reduce((sum, row) => sum + row[key], 0)])) as Volumes;
  return {
    ...totals,
    teamsNeeded: Math.ceil(totals.btEntryForTeam / 3 + totals.mtEntryForTeam / 1.5),
    teamsNeededAdj: Math.ceil(totals.btEntryForTeamAdj / 3 + totals.mtEntryForTeamAdj / 1.5),
    hasUplift: totals.totalBtEntry !== totals.totalBtEntryAdj || totals.totalMtEntry !== totals.totalMtEntryAdj,
  };
}

export function calculateOperationalHours(
  weather: WeatherHour[], history: HistoricalDataRow[],
  activeTriggers: (hour: WeatherHour) => WeatherTrigger[],
): OperationalHour[] {
  return weather.flatMap(hour => {
    const hist = history.find(row => row.hour === hour.hour);
    if (!hist) return [];
    const triggers = activeTriggers(hour);
    const bt = Number(hist.bt_entry_rate);
    const mt = Number(hist.mt_entry_rate);
    const btAdj = bt * (1 + triggers.reduce((sum, t) => sum + (t.impact_percent_bt ?? t.impact_percent ?? 0), 0) / 100);
    const mtAdj = mt * (1 + triggers.reduce((sum, t) => sum + (t.impact_percent_mt ?? t.impact_percent ?? 0), 0) / 100);
    const btRemoval = bt * Number(hist.bt_operator_removal);
    const mtRemoval = mt * Number(hist.mt_operator_removal);
    const btRemovalAdj = btAdj * Number(hist.bt_operator_removal);
    const mtRemovalAdj = mtAdj * Number(hist.mt_operator_removal);
    return [{ hour: hour.hour, ...sumOperationalMetrics([{
      totalBtEntry: bt, totalMtEntry: mt, totalBtEntryAdj: btAdj, totalMtEntryAdj: mtAdj,
      totalBtOpRemoval: btRemoval, totalMtOpRemoval: mtRemoval,
      totalBtOpRemovalAdj: btRemovalAdj, totalMtOpRemovalAdj: mtRemovalAdj,
      btEntryForTeam: bt - btRemoval, mtEntryForTeam: mt - mtRemoval,
      btEntryForTeamAdj: btAdj - btRemovalAdj, mtEntryForTeamAdj: mtAdj - mtRemovalAdj,
    }]) }];
  });
}

export function consolidatePoloHours(branches: OperationalHour[][]): OperationalHour[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour, ...sumOperationalMetrics(branches.flatMap(rows => rows.filter(row => row.hour === hour))),
  }));
}

export function operationalExportColumns(metrics: OperationalMetrics) {
  return {
    "Entrada BT histórica": metrics.totalBtEntry,
    "Entrada BT ajustada": metrics.totalBtEntryAdj,
    "Retirada operador BT histórica": metrics.totalBtOpRemoval,
    "Retirada operador BT ajustada": metrics.totalBtOpRemovalAdj,
    "Entrada equipe BT histórica": metrics.btEntryForTeam,
    "Entrada equipe BT ajustada": metrics.btEntryForTeamAdj,
    "Entrada MT histórica": metrics.totalMtEntry,
    "Entrada MT ajustada": metrics.totalMtEntryAdj,
    "Retirada operador MT histórica": metrics.totalMtOpRemoval,
    "Retirada operador MT ajustada": metrics.totalMtOpRemovalAdj,
    "Entrada equipe MT histórica": metrics.mtEntryForTeam,
    "Entrada equipe MT ajustada": metrics.mtEntryForTeamAdj,
    "Equipes necessárias históricas": metrics.teamsNeeded,
    "Equipes necessárias ajustadas": metrics.teamsNeededAdj,
  };
}