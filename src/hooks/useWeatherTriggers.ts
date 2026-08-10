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
      // Build query - get active triggers where base_id is null (defaults) OR matches the specific base
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
      const rows = (data ?? []) as WeatherTrigger[];

      // Base-specific triggers override the defaults with the same type + name
      const overrideKeys = new Set(
        rows.filter(r => r.base_id !== null).map(r => `${r.trigger_type}|${r.name}`)
      );
      return rows.filter(
        r => r.base_id !== null || !overrideKeys.has(`${r.trigger_type}|${r.name}`)
      );
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
// Note: wind and gust are expected in km/h
export const isTriggerActive = (
  trigger: WeatherTrigger,
  precip_mm: number,
  wind_kmh: number,
  temp_c: number,
  gust_kmh?: number
): boolean => {
  let value: number;
  switch (trigger.trigger_type) {
    case "precip":
      value = precip_mm;
      break;
    case "wind":
      value = wind_kmh;
      break;
    case "gust":
      value = gust_kmh ?? wind_kmh * 1.5; // Fallback to estimated gust
      break;
    case "temp":
      value = temp_c;
      break;
    default:
      return false;
  }

  // Ensure numeric comparison (database values may come as strings or numbers)
  const condMin = trigger.condition_min !== null ? Number(trigger.condition_min) : null;
  const condMax = trigger.condition_max !== null ? Number(trigger.condition_max) : null;
  
  const minOk = condMin === null || value >= condMin;
  const maxOk = condMax === null || value < condMax;
  
  // Special case for "Frio Intenso" - temp <= 10
  if (trigger.trigger_type === "temp" && condMin === null && condMax !== null) {
    return value <= condMax;
  }
  
  return minOk && maxOk;
};
