export const TEAM_TYPES = [
  "Emergência",
  "Gestores",
  "Poda",
  "Cesto Manutenção",
  "Cesto Obras",
  "LV Manutenção",
  "LV Obras",
  "MK Manutenção",
  "MK Obras",
  "Corte e Religa",
  "Perdas",
  "Reguladas",
] as const;

export type TeamType = typeof TEAM_TYPES[number];

export const TURNOS = [
  { letter: "A", label: "Turno A (0h-7h)", hours: [0, 1, 2, 3, 4, 5, 6, 7] },
  { letter: "B", label: "Turno B (8h-15h)", hours: [8, 9, 10, 11, 12, 13, 14, 15] },
  { letter: "C", label: "Turno C (16h-23h)", hours: [16, 17, 18, 19, 20, 21, 22, 23] },
] as const;
