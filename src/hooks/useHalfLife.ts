import { WeatherHour } from "./useWeather";

/**
 * Simple step-down decay multipliers for hours after rain stops
 * Hour 1: 90% of original uplift remains
 * Hour 2: 70% of original uplift remains  
 * Hour 3: 50% of original uplift remains
 * Hour 4+: 0% (no residual impact)
 */
export const DECAY_STEPS: Record<number, number> = {
  1: 0.9,
  2: 0.7,
  3: 0.5,
};

const CHUVA_THRESHOLD = 0.2;

export interface RainEpisode {
  startIndex: number;
  endIndex: number;
  totalMm: number;
}

export interface DecayInfo {
  tslr: number | null; // Time since last rain (hours)
  lastEpisodeSumMm: number | null; // Sum of last episode in mm
  decayMultiplier: number; // 0 to 1, how much of uplift remains
  lastRainUpliftBT: number | null; // Uplift BT at last rain hour (to apply decay on)
  lastRainUpliftMT: number | null; // Uplift MT at last rain hour (to apply decay on)
}

/**
 * Calculate decay multiplier using simple step-down approach
 * Returns the multiplier based on hours since last rain (TSLR)
 */
export const calculateDecayMultiplier = (tslr: number): number => {
  if (tslr <= 0) return 1;
  if (tslr > 3) return 0; // No residual after 3 hours
  return DECAY_STEPS[tslr] ?? 0;
};

/**
 * Detect rain episodes in weather forecast
 * An episode starts when precip >= threshold and ends when precip < threshold
 */
export const detectRainEpisodes = (
  weatherData: WeatherHour[],
  threshold: number = CHUVA_THRESHOLD
): RainEpisode[] => {
  const episodes: RainEpisode[] = [];
  let insideEpisode = false;
  let startIndex = -1;
  let totalMm = 0;

  for (let i = 0; i < weatherData.length; i++) {
    const precip = weatherData[i].precip_mm;
    
    if (precip >= threshold && !insideEpisode) {
      // Start new episode
      insideEpisode = true;
      startIndex = i;
      totalMm = precip;
    } else if (precip >= threshold && insideEpisode) {
      // Continue episode
      totalMm += precip;
    } else if (precip < threshold && insideEpisode) {
      // End episode
      episodes.push({
        startIndex,
        endIndex: i - 1,
        totalMm,
      });
      insideEpisode = false;
      startIndex = -1;
      totalMm = 0;
    }
  }

  // Handle episode that extends to end of data
  if (insideEpisode) {
    episodes.push({
      startIndex,
      endIndex: weatherData.length - 1,
      totalMm,
    });
  }

  return episodes;
};

/**
 * Calculate decay info for each hour in the weather forecast
 * Note: This only calculates TSLR and episode info. The actual uplift values
 * must be set later after calculating weather uplifts for rain hours.
 */
export const calculateDecayInfo = (
  weatherData: WeatherHour[]
): { decayInfos: DecayInfo[]; episodes: RainEpisode[] } => {
  const episodes = detectRainEpisodes(weatherData);
  const decayInfos: DecayInfo[] = new Array(weatherData.length).fill(null).map(() => ({
    tslr: null,
    lastEpisodeSumMm: null,
    decayMultiplier: 1,
    lastRainUpliftBT: null,
    lastRainUpliftMT: null,
  }));

  // For each episode, calculate TSLR for subsequent hours
  for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
    const episode = episodes[epIndex];
    const nextEpisode = episodes[epIndex + 1];
    
    // Find the cutoff (start of next episode or end of data)
    const cutoff = nextEpisode ? nextEpisode.startIndex : weatherData.length;
    
    // Calculate TSLR for hours after this episode ends (max 3 hours of decay)
    for (let i = episode.endIndex + 1; i < cutoff; i++) {
      const tslr = i - episode.endIndex;
      
      // Simple step-down decay multiplier
      const decayMultiplier = calculateDecayMultiplier(tslr);
      
      decayInfos[i] = {
        tslr,
        lastEpisodeSumMm: episode.totalMm,
        decayMultiplier,
        lastRainUpliftBT: null, // Will be set in simulation after calculating rain hour uplifts
        lastRainUpliftMT: null,
      };
    }
  }

  return { decayInfos, episodes };
};

/**
 * Set the last rain uplift values for decay hours based on the uplift at the last hour of each episode
 */
export const setLastRainUplifts = (
  decayInfos: DecayInfo[],
  episodes: RainEpisode[],
  upliftsByHour: { upliftBT: number; upliftMT: number }[]
): void => {
  for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
    const episode = episodes[epIndex];
    const nextEpisode = episodes[epIndex + 1];
    
    // Get the uplift at the last hour of this rain episode
    const lastRainHourIndex = episode.endIndex;
    const lastRainUplift = upliftsByHour[lastRainHourIndex] || { upliftBT: 0, upliftMT: 0 };
    
    // Find the cutoff (start of next episode or end of data)
    const cutoff = nextEpisode ? nextEpisode.startIndex : decayInfos.length;
    
    // Set the last rain uplift for all decay hours after this episode
    for (let i = episode.endIndex + 1; i < cutoff; i++) {
      if (decayInfos[i]) {
        decayInfos[i].lastRainUpliftBT = lastRainUplift.upliftBT;
        decayInfos[i].lastRainUpliftMT = lastRainUplift.upliftMT;
      }
    }
  }
};

/**
 * Apply decay to uplift based on time since last rain
 * Returns the decayed uplift value using simple step-down model
 */
export const applyDecay = (
  baseUplift: number,
  tslr: number | null
): number => {
  // No decay during active rain or if no previous episode
  if (baseUplift <= 0 || tslr === null) {
    return baseUplift;
  }

  const decayMultiplier = calculateDecayMultiplier(tslr);
  return Math.max(0, baseUplift * decayMultiplier);
};

/**
 * Format decay info for display
 */
export const formatDecayInfo = (decayInfo: DecayInfo): string => {
  if (decayInfo.tslr === null) {
    return "";
  }
  
  const remainingPercent = Math.round(decayInfo.decayMultiplier * 100);
  return `${decayInfo.tslr}h após chuva (${remainingPercent}% restante)`;
};
