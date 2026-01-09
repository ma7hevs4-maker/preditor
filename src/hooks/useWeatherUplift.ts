import { WeatherTrigger, isTriggerActive } from "./useWeatherTriggers";
import { DecayInfo, applyDecay } from "./useHalfLife";

/**
 * Calculate combined weather uplift for BT and MT based on active triggers
 * Note: wind and gust are expected in km/h
 * Optionally applies decay based on time since last rain
 */
export const calculateWeatherUplift = (
  triggers: WeatherTrigger[] | undefined,
  precip_mm: number,
  wind_kmh: number,
  temp_c: number,
  decayInfo?: DecayInfo,
  gust_kmh?: number
): { upliftBT: number; upliftMT: number; upliftBTRaw: number; upliftMTRaw: number } => {
  if (!triggers || triggers.length === 0) {
    return { upliftBT: 0, upliftMT: 0, upliftBTRaw: 0, upliftMTRaw: 0 };
  }

  let totalBT = 0;
  let totalMT = 0;

  for (const trigger of triggers) {
    if (isTriggerActive(trigger, precip_mm, wind_kmh, temp_c, gust_kmh)) {
      totalBT += (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
      totalMT += (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
    }
  }

  // Convert percentages to multipliers (e.g., 28% -> 0.28)
  const rawBT = totalBT / 100;
  const rawMT = totalMT / 100;

  // Apply decay if we have decay info and are in a post-rain period
  // Only apply decay to rain-related triggers (when it's not actively raining)
  let finalBT = rawBT;
  let finalMT = rawMT;

  if (decayInfo && decayInfo.tslr !== null && precip_mm < 0.2) {
    // We're in a decay period - apply half-life reduction
    finalBT = applyDecay(rawBT, decayInfo.tslr, decayInfo.lastEpisodeSumMm, "bt_total");
    finalMT = applyDecay(rawMT, decayInfo.tslr, decayInfo.lastEpisodeSumMm, "mt_total");
  }

  return {
    upliftBT: finalBT,
    upliftMT: finalMT,
    upliftBTRaw: rawBT,
    upliftMTRaw: rawMT,
  };
};
