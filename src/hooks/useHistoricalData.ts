import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Season = "verao" | "inverno";

// Verão: meses 1, 2, 3, 10, 11, 12 | Inverno: 4, 5, 6, 7, 8, 9
export const SUMMER_MONTHS = [1, 2, 3, 10, 11, 12];

export const getSeasonForMonth = (month1to12: number): Season =>
  SUMMER_MONTHS.includes(month1to12) ? "verao" : "inverno";

export const getCurrentSeason = (date: Date = new Date()): Season =>
  getSeasonForMonth(date.getMonth() + 1);

export const SEASON_LABEL: Record<Season, string> = {
  verao: "Verão",
  inverno: "Inverno",
};

export interface HistoricalDataRow {
  id: string;
  base_id: string;
  hour: number;
  bt_productivity: number;
  bt_entry_rate: number;
  bt_operator_removal: number;
  mt_productivity: number;
  mt_entry_rate: number;
  mt_operator_removal: number;
  season: Season;
}

export const useHistoricalData = (baseId: string | null, season?: Season) => {
  const effectiveSeason: Season = season ?? getCurrentSeason();
  return useQuery({
    queryKey: ["historical_data", baseId, effectiveSeason],
    queryFn: async () => {
      if (!baseId) return [];
      
      const { data, error } = await supabase
        .from("historical_data")
        .select("*")
        .eq("base_id", baseId)
        .eq("season", effectiveSeason)
        .order("hour");
      
      if (error) throw error;
      return data as HistoricalDataRow[];
    },
    enabled: !!baseId,
  });
};

export const useUpdateHistoricalData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<HistoricalDataRow> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from("historical_data")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical_data"] });
    },
  });
};

/**
 * Dados históricos agregados de várias bases (sucursais).
 * - Entradas (bt/mt_entry_rate): SOMA das sucursais
 * - Produtividade e retirada de operador: MÉDIA das sucursais
 */
export const useAggregatedHistoricalData = (
  baseIds: string[] | null | undefined,
  season?: Season
) => {
  const effectiveSeason: Season = season ?? getCurrentSeason();
  const ids = (baseIds ?? []).filter(Boolean);
  const key = [...ids].sort().join(",");

  return useQuery({
    queryKey: ["historical_data_agg", key, effectiveSeason],
    queryFn: async () => {
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("historical_data")
        .select("*")
        .in("base_id", ids)
        .eq("season", effectiveSeason)
        .order("hour");

      if (error) throw error;
      const rows = (data ?? []) as HistoricalDataRow[];
      if (ids.length === 1) return rows;

      const byHour = new Map<number, HistoricalDataRow[]>();
      rows.forEach((r) => {
        const list = byHour.get(r.hour) ?? [];
        list.push(r);
        byHour.set(r.hour, list);
      });

      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

      return Array.from(byHour.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([hour, list]) => ({
          id: `agg-${hour}`,
          base_id: "aggregated",
          hour,
          season: effectiveSeason,
          bt_entry_rate: sum(list.map((r) => Number(r.bt_entry_rate) || 0)),
          mt_entry_rate: sum(list.map((r) => Number(r.mt_entry_rate) || 0)),
          bt_productivity: avg(list.map((r) => Number(r.bt_productivity) || 0)),
          mt_productivity: avg(list.map((r) => Number(r.mt_productivity) || 0)),
          bt_operator_removal: avg(list.map((r) => Number(r.bt_operator_removal) || 0)),
          mt_operator_removal: avg(list.map((r) => Number(r.mt_operator_removal) || 0)),
        })) as HistoricalDataRow[];
    },
    enabled: ids.length > 0,
  });
};

// Bulk update for multiple hours
export const useBulkUpdateHistoricalData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Array<Partial<HistoricalDataRow> & { id: string }>) => {
      for (const update of updates) {
        const { id, ...data } = update;
        const { error } = await supabase
          .from("historical_data")
          .update(data)
          .eq("id", id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical_data"] });
    },
  });
};
