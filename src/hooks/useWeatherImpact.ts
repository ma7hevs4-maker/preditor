import { useState, useCallback, useEffect } from 'react';

export const useWeatherImpact = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('weather-impact-enabled');
      return stored !== null ? stored === 'true' : true; // Default enabled
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('weather-impact-enabled', String(enabled));
  }, [enabled]);

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  return {
    enabled,
    setEnabled,
    toggleEnabled
  };
};
