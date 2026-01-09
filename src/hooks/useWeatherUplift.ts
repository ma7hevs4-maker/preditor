import { WeatherTrigger, isTriggerActive } from "./useWeatherTriggers";
import { DecayInfo, getHalfLifeHours, calculateDecayMultiplier } from "./useHalfLife";

/**
 * Get the rain intensity bin based on episode sum (mm)
 * This maps to the trigger condition ranges
 */
const getRainBinFromEpisodeSum = (episodeSumMm: number): { min: number; max: number } => {
  // Map episode intensity to representative hourly rate that would have triggered
  // Based on Python: UPLIFT_CHUVA ranges: 0.2-1, 1-5, 5-10, gt10
  if (episodeSumMm <= 1) return { min: 0.2, max: 1 };
  if (episodeSumMm <= 5) return { min: 1, max: 5 };
  if (episodeSumMm <= 10) return { min: 5, max: 10 };
  return { min: 10, max: Infinity };
};

/**
 * Calculate the base rain uplift from triggers based on the episode intensity
 * This is needed to calculate residual impact after rain stops
 */
const calculateRainTriggersUpliftFromEpisode = (
  triggers: WeatherTrigger[],
  lastEpisodeSumMm: number
): { rainUpliftBT: number; rainUpliftMT: number } => {
  let totalBT = 0;
  let totalMT = 0;

  const rainBin = getRainBinFromEpisodeSum(lastEpisodeSumMm);

  for (const trigger of triggers) {
    if (!trigger.active) continue;
    
    // Check rain/precip triggers (database uses 'precip')
    if (trigger.trigger_type === "rain" || trigger.trigger_type === "precip") {
      const triggerMin = trigger.condition_min ?? -Infinity;
      const triggerMax = trigger.condition_max ?? Infinity;
      
      // Check if the episode intensity falls within this trigger's range
      // Use a representative value from the rain bin
      const representativeValue = (rainBin.min + Math.min(rainBin.max, 20)) / 2;
      
      if (representativeValue >= triggerMin && representativeValue < triggerMax) {
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
 * Applies decay based on time since last rain when not actively raining
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

  // Calculate current active triggers (rain, wind, gust, temp)
  let currentBT = 0;
  let currentMT = 0;

  for (const trigger of triggers) {
    if (isTriggerActive(trigger, precip_mm, wind_kmh, temp_c, gust_kmh)) {
      currentBT += (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
      currentMT += (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
    }
  }

  // Convert percentages to multipliers
  const rawBT = currentBT / 100;
  const rawMT = currentMT / 100;

  let finalBT = rawBT;
  let finalMT = rawMT;

  // If not actively raining AND we have decay info, calculate residual rain impact
  const isNotRaining = precip_mm < 0.2;
  const hasDecayInfo = decayInfo && decayInfo.tslr !== null && decayInfo.lastEpisodeSumMm !== null;

  if (isNotRaining && hasDecayInfo) {
    // Get what the rain uplift would have been based on the last episode
    const { rainUpliftBT, rainUpliftMT } = calculateRainTriggersUpliftFromEpisode(
      triggers, 
      decayInfo.lastEpisodeSumMm!
    );
    
    // Apply exponential decay based on time since rain and episode intensity
    const halfLifeBT = getHalfLifeHours("bt_total", decayInfo.lastEpisodeSumMm!);
    const halfLifeMT = getHalfLifeHours("mt_total", decayInfo.lastEpisodeSumMm!);
    
    const decayedRainBT = rainUpliftBT * calculateDecayMultiplier(decayInfo.tslr!, halfLifeBT);
    const decayedRainMT = rainUpliftMT * calculateDecayMultiplier(decayInfo.tslr!, halfLifeMT);
    
    // Get non-rain triggers that are currently active (wind, gust, temp)
    let nonRainBT = 0;
    let nonRainMT = 0;
    
    for (const trigger of triggers) {
      const isRainTrigger = trigger.trigger_type === "rain" || trigger.trigger_type === "precip";
      if (!isRainTrigger && isTriggerActive(trigger, precip_mm, wind_kmh, temp_c, gust_kmh)) {
        nonRainBT += (trigger.impact_percent_bt ?? trigger.impact_percent ?? 0);
        nonRainMT += (trigger.impact_percent_mt ?? trigger.impact_percent ?? 0);
      }
    }
    
    // Final uplift = active non-rain triggers + decayed rain residual
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
