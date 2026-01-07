import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeatherTrigger {
  id: string;
  base_id: string | null;
  name: string;
  trigger_type: string;
  condition_min: number | null;
  condition_max: number | null;
  impact_percent: number;
  impact_percent_bt: number | null;
  impact_percent_mt: number | null;
  description: string | null;
  active: boolean;
}

export const useWeatherTriggers = (baseId: string | null = null) => {
  return useQuery({
    queryKey: ["weather_triggers", baseId],
    queryFn: async () => {
      // Get default triggers (base_id is null) and base-specific triggers
      let query = supabase
        .from("weather_triggers")
        .select("*")
        .eq("active", true);
      
      if (baseId) {
        // Get triggers where base_id is null (defaults) OR matches the specific base
        query = query.or(`base_id.is.null,base_id.eq.${baseId}`);
      } else {
        // Only get default triggers
        query = query.is("base_id", null);
      }
      
      const { data, error } = await query.order("trigger_type").order("condition_min");
      
      if (error) throw error;
      return data as WeatherTrigger[];
    },
  });
};

export const useAllWeatherTriggers = () => {
  return useQuery({
    queryKey: ["weather_triggers", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weather_triggers")
        .select("*")
        .order("trigger_type")
        .order("condition_min");
      
      if (error) throw error;
      return data as WeatherTrigger[];
    },
  });
};

export const useAddWeatherTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trigger: Omit<WeatherTrigger, "id">) => {
      const { data, error } = await supabase
        .from("weather_triggers")
        .insert([trigger])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weather_triggers"] });
    },
  });
};

export const useUpdateWeatherTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WeatherTrigger> & { id: string }) => {
      const { error } = await supabase
        .from("weather_triggers")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weather_triggers"] });
    },
  });
};

export const useDeleteWeatherTrigger = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("weather_triggers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weather_triggers"] });
    },
  });
};

// Helper function to check if a trigger is active based on weather conditions
export const isTriggerActive = (
  trigger: WeatherTrigger,
  precip_mm: number,
  wind_kmh: number,
  temp_c: number
): boolean => {
  let value: number;
  switch (trigger.trigger_type) {
    case "precip":
      value = precip_mm;
      break;
    case "wind":
      value = wind_kmh;
      break;
    case "temp":
      value = temp_c;
      break;
    default:
      return false;
  }

  const minOk = trigger.condition_min === null || value >= trigger.condition_min;
  const maxOk = trigger.condition_max === null || value < trigger.condition_max;
  
  // Special case for "Frio Intenso" - temp <= 10
  if (trigger.trigger_type === "temp" && trigger.condition_min === null && trigger.condition_max !== null) {
    return value <= trigger.condition_max;
  }
  
  return minOk && maxOk;
};
