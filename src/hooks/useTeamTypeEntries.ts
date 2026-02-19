import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamTypeEntry {
  id: string;
  daily_plan_id: string;
  team_type: string;
  hour: number;
  quantity: number;
}

// Fetch all type entries for a given plan
export const useTeamTypeEntries = (planId: string | null) => {
  return useQuery({
    queryKey: ["team_type_entries", planId],
    queryFn: async () => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("daily_team_type_entries")
        .select("*")
        .eq("daily_plan_id", planId);
      if (error) throw error;
      return data as TeamTypeEntry[];
    },
    enabled: !!planId,
  });
};

// Fetch entries for multiple plans (for the view page)
export const useTeamTypeEntriesByPlans = (planIds: string[]) => {
  return useQuery({
    queryKey: ["team_type_entries_bulk", planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];
      const { data, error } = await supabase
        .from("daily_team_type_entries")
        .select("*")
        .in("daily_plan_id", planIds);
      if (error) throw error;
      return data as TeamTypeEntry[];
    },
    enabled: planIds.length > 0,
  });
};

// Convert entries array to a map: { [teamType]: { [hour]: quantity } }
export const entriesToMap = (entries: TeamTypeEntry[]): Record<string, Record<number, number>> => {
  const map: Record<string, Record<number, number>> = {};
  entries.forEach(e => {
    if (!map[e.team_type]) map[e.team_type] = {};
    map[e.team_type][e.hour] = e.quantity;
  });
  return map;
};

// Upsert all entries for a plan (delete old + insert new)
export const useUpsertTeamTypeEntries = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, entries }: { planId: string; entries: { team_type: string; hour: number; quantity: number }[] }) => {
      // Delete existing
      await supabase.from("daily_team_type_entries").delete().eq("daily_plan_id", planId);

      // Insert non-zero entries
      const toInsert = entries
        .filter(e => e.quantity > 0)
        .map(e => ({ daily_plan_id: planId, ...e }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("daily_team_type_entries").insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_type_entries"] });
      queryClient.invalidateQueries({ queryKey: ["team_type_entries_bulk"] });
    },
  });
};
