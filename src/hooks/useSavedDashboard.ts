import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        .order("saved_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SavedDashboardEntry | null;
    },
  });

  const saveDashboard = useMutation({
    mutationFn: async (params: { data: any[]; incFileName?: string; m300FileName?: string }) => {
      // Delete all existing entries first (keep only latest)
      await supabase.from("saved_dashboard_data").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { data, error } = await supabase
        .from("saved_dashboard_data")
        .insert({
          data: params.data as unknown,
          source_files: { incFileName: params.incFileName, m300FileName: params.m300FileName },
        } as never)
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
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-dashboard-latest"] });
    },
  });

  return { latest, isLoading, saveDashboard, deleteDashboard };
};
