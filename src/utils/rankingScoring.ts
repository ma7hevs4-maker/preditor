/**
 * Ranking scoring logic for the operational dashboard.
 * Each team gets a score based on normalized metrics with configurable weights.
 * Higher score = better team performance.
 */

export interface RankingWeights {
  incidentes: number;
  improdutivos: number;
  reincidentes: number;
  dias: number;
  ociosidade: number;
  inc_ociosidade: number;
  login: number;
  despacho: number;
  plataforma: number;
  retorno: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  incidentes: 15,
  improdutivos: 10,
  reincidentes: 10,
  dias: 15,
  ociosidade: 15,
  inc_ociosidade: 10,
  login: 5,
  despacho: 5,
  plataforma: 10,
  retorno: 5,
};

export interface TeamRankingData {
  Equipe: string;
  Incidentes: number;
  Improdutivos: number;
  "Reincidentes causados": number;
  TMDE: number;
  "Ordem 2": number;
  Ocupação: number;
  Dias: number;
  "Ociosidade (min)": number;
  "Inc. Ociosid.": number;
  Login: string;
  Despacho: string;
  "Tempo de plataforma": string;
  "Retorno Base": string;
}

// Metrics where higher = better
const HIGHER_IS_BETTER = new Set(["incidentes", "dias"]);

// Metric keys mapping to TeamRankingData fields
const METRIC_FIELDS: Record<keyof RankingWeights, { field: string; parse: (row: TeamRankingData) => number | null }> = {
  incidentes: { field: "Incidentes", parse: (r) => r.Incidentes },
  improdutivos: { field: "Improdutivos", parse: (r) => r.Improdutivos },
  reincidentes: { field: "Reincidentes causados", parse: (r) => r["Reincidentes causados"] },
  dias: { field: "Dias", parse: (r) => r.Dias },
  ociosidade: { field: "Ociosidade (min)", parse: (r) => r["Ociosidade (min)"] },
  inc_ociosidade: { field: "Inc. Ociosid.", parse: (r) => r["Inc. Ociosid."] },
  login: { field: "Login", parse: (r) => r.Login === "-" ? null : Number(r.Login) },
  despacho: { field: "Despacho", parse: (r) => r.Despacho === "-" ? null : Number(r.Despacho) },
  plataforma: { field: "Tempo de plataforma", parse: (r) => r["Tempo de plataforma"] === "-" ? null : Number(r["Tempo de plataforma"]) },
  retorno: { field: "Retorno Base", parse: (r) => r["Retorno Base"] === "-" ? null : Number(r["Retorno Base"]) },
};

/**
 * Calculate normalized scores for each team.
 * Returns the original data augmented with a `pontuacao` field and `hasIncompleteData` flag.
 */
export function calculateRankingScores(
  teams: TeamRankingData[],
  weights: RankingWeights
): (TeamRankingData & { pontuacao: number; hasIncompleteData: boolean })[] {
  if (teams.length === 0) return [];

  // Collect min/max for each metric (excluding nulls)
  const metricKeys = Object.keys(weights) as (keyof RankingWeights)[];
  const minMax: Record<string, { min: number; max: number; values: (number | null)[] }> = {};

  metricKeys.forEach((key) => {
    const values = teams.map((t) => METRIC_FIELDS[key].parse(t));
    const validValues = values.filter((v): v is number => v !== null);
    minMax[key] = {
      min: validValues.length > 0 ? Math.min(...validValues) : 0,
      max: validValues.length > 0 ? Math.max(...validValues) : 0,
      values,
    };
  });

  // Normalize each metric to 0-1 and compute weighted score
  const totalWeight = metricKeys.reduce((sum, k) => sum + weights[k], 0) || 1;

  return teams.map((team, idx) => {
    let score = 0;
    let hasIncompleteData = false;
    let activeWeight = 0;

    metricKeys.forEach((key) => {
      const value = minMax[key].values[idx];
      const weight = weights[key];
      if (weight === 0) return;

      if (value === null) {
        hasIncompleteData = true;
        return; // Skip this metric for this team
      }

      const { min, max } = minMax[key];
      const range = max - min;
      let normalized = range > 0 ? (value - min) / range : 0.5;

      // For "lower is better" metrics, invert the normalization
      if (!HIGHER_IS_BETTER.has(key)) {
        normalized = 1 - normalized;
      }

      score += normalized * weight;
      activeWeight += weight;
    });

    // Scale score to 0-100 based on active weights
    const finalScore = activeWeight > 0 ? (score / activeWeight) * 100 : 0;

    return {
      ...team,
      pontuacao: Math.round(finalScore * 10) / 10,
      hasIncompleteData,
    };
  });
}

/**
 * Parse ranking weights from system_settings array.
 */
export function parseWeightsFromSettings(
  settings: { key: string; value: string }[] | undefined
): RankingWeights {
  const weights = { ...DEFAULT_WEIGHTS };
  if (!settings) return weights;

  const keyMap: Record<string, keyof RankingWeights> = {
    ranking_weight_incidentes: "incidentes",
    ranking_weight_improdutivos: "improdutivos",
    ranking_weight_reincidentes: "reincidentes",
    ranking_weight_dias: "dias",
    ranking_weight_ociosidade: "ociosidade",
    ranking_weight_inc_ociosidade: "inc_ociosidade",
    ranking_weight_login: "login",
    ranking_weight_despacho: "despacho",
    ranking_weight_plataforma: "plataforma",
    ranking_weight_retorno: "retorno",
  };

  settings.forEach((s) => {
    const weightKey = keyMap[s.key];
    if (weightKey) {
      const val = Number(s.value);
      if (!isNaN(val)) weights[weightKey] = val;
    }
  });

  return weights;
}

/**
 * Mapping of Polo values from data to UTS/UTN hierarchy.
 */
export const POLO_TO_UT: Record<string, "UTS" | "UTN"> = {
  "Magé": "UTS",
  "Niterói": "UTS",
  "São Gonçalo": "UTS",
  "Serrana": "UTS",
  "Sul": "UTS",
  "Campos": "UTN",
  "Macaé": "UTN",
  "Lagos": "UTN",
  "Noroeste": "UTN",
};

export const UTS_POLOS = ["Magé", "Niterói", "São Gonçalo", "Serrana", "Sul"];
export const UTN_POLOS = ["Campos", "Macaé", "Lagos", "Noroeste"];
