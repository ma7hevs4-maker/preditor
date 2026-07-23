/**
 * Mapa de prefixo (2 primeiras letras do nome da equipe) → Polo de origem.
 * Usado no dashboard operacional para classificar equipes como próprias
 * (prefixo pertence ao Polo do incidente) ou emprestadas (prefixo é de outro Polo).
 */
export const TEAM_PREFIX_TO_POLO: Record<string, string> = {
  CP: "Campos",
  AR: "Lagos",
  CF: "Lagos",
  MC: "Macaé",
  MG: "Magé",
  NI: "Niterói",
  CG: "Noroeste",
  PD: "Noroeste",
  IT: "Noroeste",
  SG: "São Gonçalo",
  PE: "Serrana",
  TE: "Serrana",
  AN: "Sul",
  RE: "Sul",
};

/** Extrai o prefixo (2 primeiras letras maiúsculas) do nome da equipe. */
export function getTeamPrefix(equipe: string | null | undefined): string | null {
  if (!equipe) return null;
  const s = String(equipe).trim().toUpperCase();
  const first = s.split(/[/;+]| e /)[0].trim();
  const match = first.match(/^([A-Z]{2})/);
  return match ? match[1] : null;
}

/** Retorna o Polo de origem da equipe com base no prefixo, ou null se desconhecido. */
export function getTeamOriginPolo(equipe: string | null | undefined): string | null {
  const prefix = getTeamPrefix(equipe);
  if (!prefix) return null;
  return TEAM_PREFIX_TO_POLO[prefix] ?? null;
}

export type TeamOriginKind = "propria" | "emprestada" | "desconhecida";

/**
 * Classifica uma equipe em relação ao Polo do incidente.
 * - propria: prefixo pertence ao Polo do incidente
 * - emprestada: prefixo pertence a outro Polo
 * - desconhecida: prefixo não mapeado
 */
export function classifyTeamOrigin(
  equipe: string | null | undefined,
  incidentPolo: string | null | undefined,
): TeamOriginKind {
  const origin = getTeamOriginPolo(equipe);
  if (!origin) return "desconhecida";
  if (!incidentPolo) return "desconhecida";
  return origin.toLowerCase() === String(incidentPolo).toLowerCase()
    ? "propria"
    : "emprestada";
}