import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DecayCurve {
  id: string;
  base_id: string;
  period: string;
  level: string; // "BT" | "MT"
  trigger_type: string; // precip | gust | temp
  trigger_name: string;
  hour_1: number;
  hour_2: number;
  hour_3: number;
  hour_4: number;
  hour_5: number;
  hour_6: number;
  hour_7: number;
  hour_8: number;
  hour_9: number;
  hour_10: number;
  hour_11: number;
  hour_12: number;
}

export const DECAY_HOUR_KEYS = [
  "hour_1", "hour_2", "hour_3", "hour_4", "hour_5", "hour_6",
  "hour_7", "hour_8", "hour_9", "hour_10", "hour_11", "hour_12",
] as const;

/** Curvas de decay de uma base (ou todas quando baseId é null) */
export const useDecayCurves = (baseId: string | null = null) => {
  return useQuery({
    queryKey: ["weather_decay_curves", baseId],
    queryFn: async () => {
      let query = supabase.from("weather_decay_curves").select("*");
      if (baseId) query = query.eq("base_id", baseId);
      const { data, error } = await query
        .order("trigger_type")
        .order("trigger_name")
        .order("level");
      if (error) throw error;
      return (data ?? []) as DecayCurve[];
    },
  });
};

export const useUpdateDecayCurve = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<DecayCurve> & { id: string }) => {
      const { error } = await supabase
        .from("weather_decay_curves")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weather_decay_curves"] });
    },
  });
};
