import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeatherProvider } from "./useWeatherProvider";

export interface WeatherHour {
  hour: number;
  datetime: string;
  temp_c: number;
  precip_mm: number;
  wind_kmh: number;
  gust_kmh: number;
  humidity: number;
  description: string;
  icon: string;
}

interface WeatherResponse {
  forecast: WeatherHour[];
  provider?: string;
  city?: string;
  country?: string;
  error?: string;
}

export const useWeather = (
  lat: number | null, 
  lon: number | null, 
  hours: number = 72,
  provider: WeatherProvider = "openmeteo"
) => {
  return useQuery({
    queryKey: ["weather", lat, lon, hours, provider],
    queryFn: async () => {
      if (!lat || !lon) return null;
      
      const { data, error } = await supabase.functions.invoke<WeatherResponse>("weather-forecast", {
        body: { lat, lon, hours, provider },
      });
      
      if (error) {
        console.error("Weather API error:", error);
        throw error;
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    enabled: !!lat && !!lon,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
  });
};
