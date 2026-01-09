import { WeatherTrigger, isTriggerActive } from "./useWeatherTriggers";
import { DecayInfo, calculateDecayMultiplier } from "./useHalfLife";

/**
 * Calculate the uplift from currently active triggers based on weather conditions
 * Can optionally exclude rain triggers to get only wind/temp/gust effects
 */
export const calculateActiveTriggersUplift = (
  triggers: WeatherTrigger[] | undefined,
  precip_mm: number,
  wind_kmh: number,
  temp_c: number,
  gust_kmh?: number,
  excludeRainTriggers: boolean = false
): { upliftBT: number; upliftMT: number; nonRainUpliftBT: number; nonRainUpliftMT: number } => {
  if (!triggers || triggers.length === 0) {
    return { upliftBT: 0, upliftMT: 0, nonRainUpliftBT: 0, nonRainUpliftMT: 0 };
  }

  let totalBT = 0;
  let totalMT = 0;
  let nonRainBT = 0;
  let nonRainMT = 0;

  for (const trigger of triggers) {
    if (isTriggerActive(trigger, precip_mm, wind_kmh, temp_c, gust_kmh)) {
      const impactBT = (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
      const impactMT = (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
      
      const isRainTrigger = trigger.trigger_type === "rain" || trigger.trigger_type === "precip";
      
      if (!isRainTrigger) {
        nonRainBT += impactBT;
        nonRainMT += impactMT;
      }
      
      if (!excludeRainTriggers || !isRainTrigger) {
        totalBT += impactBT;
        totalMT += impactMT;
      }
    }
  }

  return {
    upliftBT: totalBT / 100,
    upliftMT: totalMT / 100,
    nonRainUpliftBT: nonRainBT / 100,
    nonRainUpliftMT: nonRainMT / 100,
  };
};

/**
 * Calculate combined weather uplift for BT and MT based on active triggers
 * Applies simple step-down decay (90%/70%/50%) for first 3 hours after rain stops
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

  // Calculate current active triggers
  const { upliftBT: rawBT, upliftMT: rawMT, nonRainUpliftBT, nonRainUpliftMT } = calculateActiveTriggersUplift(
    triggers,
    precip_mm,
    wind_kmh,
    temp_c,
    gust_kmh
  );

  let finalBT = rawBT;
  let finalMT = rawMT;

  // If not actively raining AND we have decay info with last rain uplifts, calculate residual
  const isNotRaining = precip_mm < 0.2;
  const hasDecayInfo = decayInfo && 
    decayInfo.tslr !== null && 
    decayInfo.lastRainUpliftBT !== null &&
    decayInfo.lastRainUpliftMT !== null;

  if (isNotRaining && hasDecayInfo) {
    // Simple step-down decay: 90% at 1h, 70% at 2h, 50% at 3h, 0% after
    const decayMultiplier = calculateDecayMultiplier(decayInfo.tslr!);
    
    const decayedRainBT = decayInfo.lastRainUpliftBT! * decayMultiplier;
    const decayedRainMT = decayInfo.lastRainUpliftMT! * decayMultiplier;
    
    // Final uplift = active non-rain triggers + decayed rain residual
    finalBT = nonRainUpliftBT + decayedRainBT;
    finalMT = nonRainUpliftMT + decayedRainMT;
  }

  return {
    upliftBT: finalBT,
    upliftMT: finalMT,
    upliftBTRaw: rawBT,
    upliftMTRaw: rawMT,
  };
};
