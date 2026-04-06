import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SAVED_DASHBOARD_SINGLETON_ID = "00000000-0000-0000-0000-000000000001";

export interface SavedDashboardEntry {
  id: string;
  data: any[];
  source_files: { incFileName?: string; m300FileName?: string } | null;
  saved_at: string;
  updated_at: string;
}

export const useSavedDashboard = () => {
  const queryClient = useQueryClient();

  const { data: latest, isLoading } = useQuery({
    queryKey: ["saved-dashboard-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_dashboard_data")
        .select("*")
        .eq("id", SAVED_DASHBOARD_SINGLETON_ID)
        .maybeSingle();

      if (error) throw error;
      return data as SavedDashboardEntry | null;
    },
  });

  const saveDashboard = useMutation({
    mutationFn: async (params: { data: any[]; incFileName?: string; m300FileName?: string }) => {
      const { data, error } = await supabase
        .from("saved_dashboard_data")
        .upsert({
          id: SAVED_DASHBOARD_SINGLETON_ID,
          data: params.data as unknown,
          source_files: { incFileName: params.incFileName, m300FileName: params.m300FileName },
        } as never, {
          onConflict: "id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-dashboard-latest"] });
    },
  });

  const deleteDashboard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("saved_dashboard_data")
        .delete()
        .eq("id", SAVED_DASHBOARD_SINGLETON_ID);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-dashboard-latest"] });
    },
  });

  return { latest, isLoading, saveDashboard, deleteDashboard };
};
