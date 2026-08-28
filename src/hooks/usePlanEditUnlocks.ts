import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlanKind } from "@/hooks/useDailyTeamPlans";

export interface PlanEditUnlock {
  id: string;
  base_id: string;
  plan_kind: PlanKind;
  start_date: string;
  end_date: string;
  note: string | null;
  created_by: string | null;
  consumed_dates: string[];
  active: boolean;
  created_at: string;
}

export const usePlanEditUnlocks = (planKind?: PlanKind) => {
  return useQuery({
    queryKey: ["plan_edit_unlocks", planKind ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("plan_edit_unlocks")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (planKind) query = query.eq("plan_kind", planKind);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PlanEditUnlock[];
    },
  });
};

export const useAddPlanEditUnlock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      base_id: string;
      plan_kind: PlanKind;
      start_date: string;
      end_date: string;
      note?: string | null;
      created_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("plan_edit_unlocks")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data as PlanEditUnlock;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_edit_unlocks"] });
    },
  });
};

export const useDeletePlanEditUnlock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_edit_unlocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_edit_unlocks"] });
    },
  });
};

/** Marks a date as saved (consumed) inside an unlock; deactivates it when the whole period is done. */
export const useConsumePlanEditUnlock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ unlock, dates }: { unlock: PlanEditUnlock; dates: string[] }) => {
      const consumed = Array.from(new Set([...(unlock.consumed_dates ?? []), ...dates]));

      // All dates in the period consumed? deactivate the unlock.
      const allDates: string[] = [];
      const cursor = new Date(`${unlock.start_date}T00:00:00`);
      const end = new Date(`${unlock.end_date}T00:00:00`);
      while (cursor <= end) {
        allDates.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
      const stillActive = allDates.some(d => !consumed.includes(d));

      const { error } = await supabase
        .from("plan_edit_unlocks")
        .update({ consumed_dates: consumed, active: stillActive })
        .eq("id", unlock.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_edit_unlocks"] });
    },
  });
};

/** Finds an active unlock covering a base + date that has not been consumed yet. */
export const findUnlockForDate = (
  unlocks: PlanEditUnlock[] | undefined,
  baseId: string,
  date: string,
): PlanEditUnlock | undefined => {
  if (!unlocks || !baseId || !date) return undefined;
  return unlocks.find(
    u =>
      u.active &&
      u.base_id === baseId &&
      u.start_date <= date &&
      u.end_date >= date &&
      !(u.consumed_dates ?? []).includes(date),
  );
};
