import { describe, expect, test } from "bun:test";
import { calculateOperationalHours, consolidatePoloHours, sumOperationalMetrics } from "../src/utils/climateOperationalExport";
import { getBaseIdsForRegional } from "../src/data/basesConfig";
import type { HistoricalDataRow } from "../src/hooks/useHistoricalData";
import type { WeatherHour } from "../src/hooks/useWeather";

const weather = [{ hour: 0, datetime: "2026-10-19T00:00", precip_mm: 0, temp_c: 20, wind_kmh: 0, gust_kmh: 0, humidity: 70, description: "", icon: "" }] satisfies WeatherHour[];
function branch(bt: number, mt: number, removal: number) {
  const history: HistoricalDataRow[] = [{ id: "row", base_id: "base", hour: 0, season: "verao", bt_entry_rate: bt, mt_entry_rate: mt, bt_operator_removal: removal, mt_operator_removal: removal, bt_productivity: 3, mt_productivity: 1.5 }];
  return calculateOperationalHours(weather, history, () => []);
}

describe("Exportação da Central Climática", () => {
  test("soma entradas e retiradas das sucursais do Polo, sem calcular média dos volumes", () => {
    const polo = consolidatePoloHours([branch(10, 2, 0.2), branch(30, 4, 0.5)]);
    const total = sumOperationalMetrics(polo);
    expect(total.totalBtEntry).toBe(40);
    expect(total.totalMtEntry).toBe(6);
    expect(total.totalBtOpRemoval).toBe(17);
    expect(total.totalMtOpRemoval).toBe(2.4);
    expect(total.btEntryForTeam).toBe(23);
    expect(polo).toHaveLength(24);
  });
  test("arredonda equipes necessárias somente depois de somar as sucursais", () => {
    const total = sumOperationalMetrics(consolidatePoloHours([branch(1, 0, 0), branch(1, 0, 0)]));
    expect(total.teamsNeeded).toBe(1);
  });
  test("Lagos inclui Araruama e Cabo Frio, sem incluir bases de outra UT", () => {
    expect(getBaseIdsForRegional("Lagos", [{ id: "ar", name: "Araruama" }, { id: "cf", name: "Cabo Frio" }, { id: "ni", name: "Niterói" }])).toEqual(["ar", "cf"]);
  });
});