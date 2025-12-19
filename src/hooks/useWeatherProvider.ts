import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type WeatherProvider = "openmeteo" | "openweathermap";

const STORAGE_KEY = "weather-provider";

export const useWeatherProvider = () => {
  const queryClient = useQueryClient();
  
  const [provider, setProviderState] = useState<WeatherProvider>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "openmeteo" || stored === "openweathermap") {
        return stored;
      }
    }
    return "openmeteo";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, provider);
  }, [provider]);

  const setProvider = useCallback((newProvider: WeatherProvider) => {
    setProviderState(newProvider);
    // Invalidate weather queries to fetch fresh data with new provider
    queryClient.invalidateQueries({ queryKey: ["weather"] });
  }, [queryClient]);

  const toggleProvider = useCallback(() => {
    setProvider(provider === "openmeteo" ? "openweathermap" : "openmeteo");
  }, [provider, setProvider]);

  return {
    provider,
    setProvider,
    toggleProvider,
    isOpenMeteo: provider === "openmeteo",
    isOpenWeatherMap: provider === "openweathermap",
  };
};
