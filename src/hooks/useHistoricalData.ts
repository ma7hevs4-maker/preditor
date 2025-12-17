import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

export const useHistoricalData = (baseId: string | null) => {
  return useQuery({
    queryKey: ["historical_data", baseId],
    queryFn: async () => {
      if (!baseId) return [];
      
      const { data, error } = await supabase
        .from("historical_data")
        .select("*")
        .eq("base_id", baseId)
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
