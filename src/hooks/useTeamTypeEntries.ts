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
// NOTE: PostgREST caps responses (default 1000 rows), so we paginate to avoid
// silently truncating hours/types when many plans are queried at once.
export const useTeamTypeEntriesByPlans = (planIds: string[]) => {
  return useQuery({
    queryKey: ["team_type_entries_bulk", planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];

      const PAGE = 1000;
      const CHUNK = 50; // limit URL length for the .in() filter
      const all: TeamTypeEntry[] = [];

      for (let i = 0; i < planIds.length; i += CHUNK) {
        const chunk = planIds.slice(i, i + CHUNK);
        let from = 0;
        // paginate until a short page is returned
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await supabase
            .from("daily_team_type_entries")
            .select("*")
            .in("daily_plan_id", chunk)
            .order("id")
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const rows = (data || []) as TeamTypeEntry[];
          all.push(...rows);
          if (rows.length < PAGE) break;
          from += PAGE;
        }
      }

      return all;
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
