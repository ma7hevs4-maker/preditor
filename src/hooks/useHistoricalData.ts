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
