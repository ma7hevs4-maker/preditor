import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanChangeLog {
  id: string;
  base_id: string;
  plan_date: string;
  plan_kind: string;
  action: string;
  author: string | null;
  note: string | null;
  changes: unknown;
  created_at: string;
}

export interface PlanChangeDetail {
  type: string;
  hour: number;
  from: number;
  to: number;
}

// Logs for a base (optionally a specific date), most recent first
export const usePlanChangeLogs = (
  baseId: string | null,
  planDate?: string | null,
  planKind: string = "realizado"
) => {
  return useQuery({
    queryKey: ["plan_change_logs", baseId, planDate, planKind],
    queryFn: async () => {
      if (!baseId) return [];
      let query = supabase
        .from("daily_plan_change_logs")
        .select("*")
        .eq("base_id", baseId)
        .eq("plan_kind", planKind)
        .order("created_at", { ascending: false })
        .limit(200);
      if (planDate) query = query.eq("plan_date", planDate);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PlanChangeLog[];
    },
    enabled: !!baseId,
  });
};

// Logs across all bases (optionally a specific date), most recent first
export const useAllPlanChangeLogs = (
  planKind: string = "realizado",
  planDate?: string | null
) => {
  return useQuery({
    queryKey: ["plan_change_logs", "all", planDate, planKind],
    queryFn: async () => {
      let query = supabase
        .from("daily_plan_change_logs")
        .select("*")
        .eq("plan_kind", planKind)
        .order("created_at", { ascending: false })
        .limit(500);
      if (planDate) query = query.eq("plan_date", planDate);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PlanChangeLog[];
    },
  });
};

export const useAddPlanChangeLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      base_id: string;
      plan_date: string;
      plan_kind?: string;
      action?: string;
      author?: string | null;
      note?: string | null;
      changes?: PlanChangeDetail[];
    }) => {
      const { error } = await supabase.from("daily_plan_change_logs").insert([
        {
          base_id: log.base_id,
          plan_date: log.plan_date,
          plan_kind: log.plan_kind ?? "realizado",
          action: log.action ?? "update",
          author: log.author ?? null,
          note: log.note ?? null,
          changes: (log.changes ?? []) as never,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_change_logs"] });
    },
  });
};

// Diff two typeData maps into a flat list of changes
export const diffTypeData = (
  before: Record<string, number[]>,
  after: Record<string, number[]>
): PlanChangeDetail[] => {
  const changes: PlanChangeDetail[] = [];
  const types = new Set([...Object.keys(before), ...Object.keys(after)]);
  types.forEach(type => {
    for (let h = 0; h < 24; h++) {
      const from = before[type]?.[h] ?? 0;
      const to = after[type]?.[h] ?? 0;
      if (from !== to) changes.push({ type, hour: h, from, to });
    }
  });
  return changes;
};