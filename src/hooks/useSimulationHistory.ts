import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SimulationRow } from "@/hooks/useSimulation";
import { WeatherHour } from "@/hooks/useWeather";
import { WeatherProvider } from "@/hooks/useWeatherProvider";

export type SimulationResult = SimulationRow;

export interface SimulationHistoryEntry {
  id: string;
  base_id: string;
  name: string;
  created_at: string;
  bt_initial_backlog: number;
  mt_initial_backlog: number;
  horizon_hours: number;
  weather_provider: WeatherProvider;
  weather_impact_enabled: boolean;
  team_structure_id: string | null;
  team_structure_snapshot: Record<string, unknown> | null;
  results_snapshot: SimulationResult[];
  weather_snapshot: WeatherHour[] | null;
  notes: string | null;
}

export interface SaveSimulationParams {
  baseId: string;
  name: string;
  btInitialBacklog: number;
  mtInitialBacklog: number;
  horizonHours: number;
  weatherProvider: WeatherProvider;
  weatherImpactEnabled: boolean;
  teamStructureId?: string;
  teamStructureSnapshot?: Record<string, unknown>;
  resultsSnapshot: SimulationResult[];
  weatherSnapshot?: WeatherHour[];
  notes?: string;
}

export const useSimulationHistory = (baseId?: string) => {
  const queryClient = useQueryClient();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ["simulation-history", baseId],
    queryFn: async () => {
      let query = supabase
        .from("simulation_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (baseId) {
        query = query.eq("base_id", baseId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        results_snapshot: item.results_snapshot as unknown as SimulationResult[],
        weather_snapshot: item.weather_snapshot as unknown as WeatherHour[] | null,
        team_structure_snapshot: item.team_structure_snapshot as Record<string, unknown> | null,
        weather_provider: item.weather_provider as WeatherProvider,
      })) as SimulationHistoryEntry[];
    },
    enabled: true,
  });

  const saveSimulation = useMutation({
    mutationFn: async (params: SaveSimulationParams) => {
      const insertData = {
        base_id: params.baseId,
        name: params.name,
        bt_initial_backlog: params.btInitialBacklog,
        mt_initial_backlog: params.mtInitialBacklog,
        horizon_hours: params.horizonHours,
        weather_provider: params.weatherProvider,
        weather_impact_enabled: params.weatherImpactEnabled,
        team_structure_id: params.teamStructureId || null,
        team_structure_snapshot: params.teamStructureSnapshot || null,
        results_snapshot: params.resultsSnapshot as unknown,
        weather_snapshot: params.weatherSnapshot as unknown || null,
        notes: params.notes || null,
      };

      const { data, error } = await supabase
        .from("simulation_history")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation-history"] });
    },
  });

  const deleteSimulation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("simulation_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation-history"] });
    },
  });

  return {
    history: history || [],
    isLoading,
    error,
    saveSimulation,
    deleteSimulation,
  };
};
