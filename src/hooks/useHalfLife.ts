import { WeatherHour } from "./useWeather";

/**
 * Half-life values from Python code
 * Defines how quickly uplift decays after rain stops based on episode intensity
 */
export const HALF_LIFE = {
  bt_equipe: { le1: 1, "1-5": 1, "5-10": 2, "10-20": 1, gt20: 2 },
  mt_equipe: { le1: 3, "1-5": 5, "5-10": 8, "10-20": 10, gt20: 12 },
  bt_total: { le1: 11, "1-5": 7, "5-10": 22, "10-20": 24, gt20: 25 },
  mt_total: { le1: 11, "1-5": 7, "5-10": 22, "10-20": 24, gt20: 25 },
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
}

/**
 * Get half-life bucket based on episode sum
 */
export const getHalfLifeBucket = (episodeSumMm: number): string => {
  if (episodeSumMm <= 1) return "le1";
  if (episodeSumMm <= 5) return "1-5";
  if (episodeSumMm <= 10) return "5-10";
  if (episodeSumMm <= 20) return "10-20";
  return "gt20";
};

/**
 * Get half-life value in hours for a specific category and episode intensity
 */
export const getHalfLifeHours = (
  category: "bt_total" | "mt_total" | "bt_equipe" | "mt_equipe",
  episodeSumMm: number
): number => {
  const bucket = getHalfLifeBucket(episodeSumMm);
  return HALF_LIFE[category][bucket as keyof typeof HALF_LIFE.bt_total] || 6;
};

/**
 * Calculate decay multiplier using exponential decay formula
 * multiplier = exp(-tslr / half_life)
 */
export const calculateDecayMultiplier = (
  tslr: number,
  halfLifeHours: number
): number => {
  if (tslr <= 0) return 1;
  return Math.exp(-tslr / halfLifeHours);
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
 */
export const calculateDecayInfo = (
  weatherData: WeatherHour[]
): DecayInfo[] => {
  const episodes = detectRainEpisodes(weatherData);
  const decayInfos: DecayInfo[] = new Array(weatherData.length).fill(null).map(() => ({
    tslr: null,
    lastEpisodeSumMm: null,
    decayMultiplier: 1,
  }));

  // For each episode, calculate TSLR for subsequent hours
  for (let epIndex = 0; epIndex < episodes.length; epIndex++) {
    const episode = episodes[epIndex];
    const nextEpisode = episodes[epIndex + 1];
    
    // Find the cutoff (start of next episode or end of data)
    const cutoff = nextEpisode ? nextEpisode.startIndex : weatherData.length;
    
    // Calculate TSLR for hours after this episode ends
    for (let i = episode.endIndex + 1; i < cutoff; i++) {
      const tslr = i - episode.endIndex;
      
      // Use bt_total half-life as reference for the multiplier display
      const halfLife = getHalfLifeHours("bt_total", episode.totalMm);
      const decayMultiplier = calculateDecayMultiplier(tslr, halfLife);
      
      decayInfos[i] = {
        tslr,
        lastEpisodeSumMm: episode.totalMm,
        decayMultiplier,
      };
    }
  }

  return decayInfos;
};

/**
 * Apply decay to uplift based on time since last rain
 * Returns the decayed uplift value
 */
export const applyDecay = (
  baseUplift: number,
  tslr: number | null,
  lastEpisodeSumMm: number | null,
  category: "bt_total" | "mt_total" | "bt_equipe" | "mt_equipe"
): number => {
  // No decay during active rain or if no previous episode
  if (baseUplift <= 0 || tslr === null || lastEpisodeSumMm === null) {
    return baseUplift;
  }

  const halfLife = getHalfLifeHours(category, lastEpisodeSumMm);
  const decayMultiplier = calculateDecayMultiplier(tslr, halfLife);
  
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
