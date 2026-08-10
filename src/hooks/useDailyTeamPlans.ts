import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanKind = "planejado" | "realizado";

export interface DailyTeamPlan {
  id: string;
  base_id: string;
  plan_date: string;
  plan_kind: string;
  teams_hour_0: number;
  teams_hour_1: number;
  teams_hour_2: number;
  teams_hour_3: number;
  teams_hour_4: number;
  teams_hour_5: number;
  teams_hour_6: number;
  teams_hour_7: number;
  teams_hour_8: number;
  teams_hour_9: number;
  teams_hour_10: number;
  teams_hour_11: number;
  teams_hour_12: number;
  teams_hour_13: number;
  teams_hour_14: number;
  teams_hour_15: number;
  teams_hour_16: number;
  teams_hour_17: number;
  teams_hour_18: number;
  teams_hour_19: number;
  teams_hour_20: number;
  teams_hour_21: number;
  teams_hour_22: number;
  teams_hour_23: number;
  loss_teams_hour_0: number;
  loss_teams_hour_1: number;
  loss_teams_hour_2: number;
  loss_teams_hour_3: number;
  loss_teams_hour_4: number;
  loss_teams_hour_5: number;
  loss_teams_hour_6: number;
  loss_teams_hour_7: number;
  loss_teams_hour_8: number;
  loss_teams_hour_9: number;
  loss_teams_hour_10: number;
  loss_teams_hour_11: number;
  loss_teams_hour_12: number;
  loss_teams_hour_13: number;
  loss_teams_hour_14: number;
  loss_teams_hour_15: number;
  loss_teams_hour_16: number;
  loss_teams_hour_17: number;
  loss_teams_hour_18: number;
  loss_teams_hour_19: number;
  loss_teams_hour_20: number;
  loss_teams_hour_21: number;
  loss_teams_hour_22: number;
  loss_teams_hour_23: number;
  created_at: string;
  updated_at: string;
}

export const useDailyTeamPlans = (
  baseId: string | null,
  startDate?: string,
  endDate?: string,
  kind: PlanKind = "planejado"
) => {
  return useQuery({
    queryKey: ["daily_team_plans", baseId, startDate, endDate, kind],
    queryFn: async () => {
      if (!baseId) return [];
      
      let query = supabase
        .from("daily_team_plans")
        .select("*")
        .eq("base_id", baseId)
        .eq("plan_kind", kind)
        .order("plan_date");
      
      if (startDate) query = query.gte("plan_date", startDate);
      if (endDate) query = query.lte("plan_date", endDate);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DailyTeamPlan[];
    },
    enabled: !!baseId,
  });
};

export const useDailyTeamPlan = (
  baseId: string | null,
  date: string | null,
  kind: PlanKind = "planejado"
) => {
  return useQuery({
    queryKey: ["daily_team_plan", baseId, date, kind],
    queryFn: async () => {
      if (!baseId || !date) return null;
      
      const { data, error } = await supabase
        .from("daily_team_plans")
        .select("*")
        .eq("base_id", baseId)
        .eq("plan_date", date)
        .eq("plan_kind", kind)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyTeamPlan | null;
    },
    enabled: !!baseId && !!date,
  });
};

export const useUpsertDailyTeamPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (plan: Omit<DailyTeamPlan, "id" | "created_at" | "updated_at">) => {
      const kind = plan.plan_kind || "planejado";
      // Try update first, then insert
      const { data: existing } = await supabase
        .from("daily_team_plans")
        .select("id")
        .eq("base_id", plan.base_id)
        .eq("plan_date", plan.plan_date)
        .eq("plan_kind", kind)
        .maybeSingle();
      
      if (existing) {
        const { data, error } = await supabase
          .from("daily_team_plans")
          .update({ ...plan, plan_kind: kind })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("daily_team_plans")
          .insert([{ ...plan, plan_kind: kind }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_team_plans"] });
      queryClient.invalidateQueries({ queryKey: ["daily_team_plan"] });
    },
  });
};

export const useDeleteDailyTeamPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_team_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_team_plans"] });
      queryClient.invalidateQueries({ queryKey: ["daily_team_plan"] });
    },
  });
};

// Helper to convert plan to arrays
export const planToTeamsArray = (plan: DailyTeamPlan): number[] => {
  return Array.from({ length: 24 }, (_, i) => plan[`teams_hour_${i}` as keyof DailyTeamPlan] as number);
};

export const planToLossTeamsArray = (plan: DailyTeamPlan): number[] => {
  return Array.from({ length: 24 }, (_, i) => plan[`loss_teams_hour_${i}` as keyof DailyTeamPlan] as number);
};

export const teamsArrayToPlanFields = (teams: number[], lossTeams: number[]) => {
  const fields: Record<string, number> = {};
  for (let i = 0; i < 24; i++) {
    fields[`teams_hour_${i}`] = teams[i] || 0;
    fields[`loss_teams_hour_${i}`] = lossTeams[i] || 0;
  }
  return fields;
};
