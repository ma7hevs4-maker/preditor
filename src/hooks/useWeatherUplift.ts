import { WeatherTrigger, isTriggerActive } from "./useWeatherTriggers";
import { DecayInfo, applyDecay, getHalfLifeHours, calculateDecayMultiplier } from "./useHalfLife";

/**
 * Calculate the base rain uplift from triggers (what would apply during active rain)
 * This is needed to calculate residual impact after rain stops
 */
const calculateRainTriggersUplift = (
  triggers: WeatherTrigger[],
  lastEpisodeSumMm: number
): { rainUpliftBT: number; rainUpliftMT: number } => {
  let totalBT = 0;
  let totalMT = 0;

  // Simulate what triggers would be active based on the episode's rain intensity
  for (const trigger of triggers) {
    if (!trigger.active) continue;
    
    // Check rain triggers based on the episode's intensity
    if (trigger.trigger_type === "rain") {
      const min = trigger.condition_min ?? -Infinity;
      const max = trigger.condition_max ?? Infinity;
      // Use hourly average approximation from episode sum
      const avgHourlyMm = lastEpisodeSumMm > 10 ? 5 : lastEpisodeSumMm > 5 ? 2.5 : lastEpisodeSumMm > 1 ? 0.5 : 0.3;
      if (avgHourlyMm >= min && avgHourlyMm < max) {
        totalBT += (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
        totalMT += (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
      }
    }
  }

  return { rainUpliftBT: totalBT / 100, rainUpliftMT: totalMT / 100 };
};

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

  let finalBT = rawBT;
  let finalMT = rawMT;

  // Apply decay if we're in a post-rain period (not actively raining)
  if (decayInfo && decayInfo.tslr !== null && decayInfo.lastEpisodeSumMm !== null && precip_mm < 0.2) {
    // Calculate what the rain impact would have been based on the last episode
    const { rainUpliftBT, rainUpliftMT } = calculateRainTriggersUplift(triggers, decayInfo.lastEpisodeSumMm);
    
    // Apply decay to the rain-related uplift
    const halfLifeBT = getHalfLifeHours("bt_total", decayInfo.lastEpisodeSumMm);
    const halfLifeMT = getHalfLifeHours("mt_total", decayInfo.lastEpisodeSumMm);
    
    const decayedRainBT = rainUpliftBT * calculateDecayMultiplier(decayInfo.tslr, halfLifeBT);
    const decayedRainMT = rainUpliftMT * calculateDecayMultiplier(decayInfo.tslr, halfLifeMT);
    
    // Add any non-rain triggers (wind, gust, temp) that are currently active + decayed rain residual
    // Non-rain triggers are NOT decayed, only rain-related impacts are
    let nonRainBT = 0;
    let nonRainMT = 0;
    
    for (const trigger of triggers) {
      if (trigger.trigger_type !== "rain" && isTriggerActive(trigger, precip_mm, wind_kmh, temp_c, gust_kmh)) {
        nonRainBT += (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
        nonRainMT += (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
      }
    }
    
    finalBT = (nonRainBT / 100) + decayedRainBT;
    finalMT = (nonRainMT / 100) + decayedRainMT;
  }

  return {
    upliftBT: finalBT,
    upliftMT: finalMT,
    upliftBTRaw: rawBT,
    upliftMTRaw: rawMT,
  };
};
