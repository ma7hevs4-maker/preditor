import { WeatherTrigger, isTriggerActive } from "./useWeatherTriggers";

/**
 * Calculate combined weather uplift for BT and MT based on active triggers
 * Note: wind is expected in km/h
 */
export const calculateWeatherUplift = (
  triggers: WeatherTrigger[] | undefined,
  precip_mm: number,
  wind_kmh: number,
  temp_c: number
): { upliftBT: number; upliftMT: number } => {
  if (!triggers || triggers.length === 0) {
    return { upliftBT: 0, upliftMT: 0 };
  }

  let totalBT = 0;
  let totalMT = 0;

  for (const trigger of triggers) {
    if (isTriggerActive(trigger, precip_mm, wind_kmh, temp_c)) {
      // Use specific BT/MT values if available, otherwise fall back to legacy impact_percent
      totalBT += (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
      totalMT += (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
    }
  }

  // Convert percentages to multipliers (e.g., 28% -> 0.28)
  return {
    upliftBT: totalBT / 100,
    upliftMT: totalMT / 100,
  };
};
