/**
 * Mapeamento de Regionais (Bases) e suas Sucursais.
 *
 * No banco de dados, cada cidade é uma base independente (ex: "Araruama", "Cabo Frio").
 * Aqui agrupamos as cidades em suas regionais para exibição no simulador.
 *
 * Uma "Regional" pode ter:
 * - Sucursais: cidades filhas (buscadas e somadas quando seleciona "Todas")
 * - Nenhuma sucursal: base única (ex: Campos, Macaé)
 */

export interface Sucursal {
  /** Nome da sucursal — deve corresponder EXATAMENTE ao campo "name" na tabela bases */
  name: string;
}

export interface Regional {
  /** Nome da regional/agrupamento exibido no dropdown */
  label: string;
  /** Sucursais pertencentes a esta regional */
  sucursais: Sucursal[];
}

/**
 * Mapa de regionais e suas sucursais.
 * O campo `label` é o nome exibido no dropdown de Base.
 * O campo `sucursais[].name` deve bater exatamente com o nome da base no banco.
 *
 * Para bases sem sucursais, o `label` deve corresponder ao nome da base no banco
 * e `sucursais` fica vazio — a própria base será usada diretamente.
 */
export const REGIONAIS: Regional[] = [
  {
    label: "Campos",
    sucursais: [], // base única: name = "Campos"
  },
  {
    label: "Macaé",
    sucursais: [], // base única: name = "Macaé"
  },
  {
    label: "Lagos",
    sucursais: [
      { name: "Araruama" },
      { name: "Cabo Frio" },
    ],
  },
  {
    label: "Noroeste",
    sucursais: [
      { name: "Cantagalo" },
      { name: "Itaperuna" },
      { name: "Pádua" },
    ],
  },
  {
    label: "Magé",
    sucursais: [], // base única: name = "Magé"
  },
  {
    label: "Niterói",
    sucursais: [
      { name: "Niterói" },
      { name: "Maricá" },
    ],
  },
  {
    label: "São Gonçalo",
    sucursais: [], // base única: name = "São Gonçalo"
  },
  {
    label: "Serrana",
    sucursais: [
      { name: "Petrópolis" },
      { name: "Teresópolis" },
    ],
  },
  {
    label: "Sul",
    sucursais: [
      { name: "Angra dos Reis" },
      { name: "Resende" },
    ],
  },
];

/**
 * Dado o nome de uma base do banco, retorna a Regional à qual pertence.
 * Busca tanto pelo label da regional (para bases únicas) quanto pelo nome de sucursal.
 */
export function findRegionalForBase(baseName: string): Regional | undefined {
  return REGIONAIS.find(
    (r) =>
      r.label.toLowerCase() === baseName.toLowerCase() ||
      r.sucursais.some((s) => s.name.toLowerCase() === baseName.toLowerCase())
  );
}

/**
 * Dado o label de uma regional e a lista de todas as bases do banco,
 * retorna os IDs das bases que pertencem a ela.
 *
 * - Para regionais SEM sucursais: retorna o ID da base com nome = label
 * - Para regionais COM sucursais: retorna IDs de todas as sucursais (ou só a selecionada)
 */
export function getBaseIdsForRegional(
  regionalLabel: string,
  allBases: { id: string; name: string }[],
  selectedSucursal?: string | null
): string[] {
  const regional = REGIONAIS.find((r) => r.label === regionalLabel);
  if (!regional) return [];

  // Base única (sem sucursais)
  if (regional.sucursais.length === 0) {
    const base = allBases.find(
      (b) => b.name.toLowerCase() === regional.label.toLowerCase()
    );
    return base ? [base.id] : [];
  }

  // Sucursal específica selecionada
  if (selectedSucursal && selectedSucursal !== "todas") {
    const base = allBases.find(
      (b) => b.name.toLowerCase() === selectedSucursal.toLowerCase()
    );
    return base ? [base.id] : [];
  }

  // Todas as sucursais
  return regional.sucursais
    .map((s) => allBases.find((b) => b.name.toLowerCase() === s.name.toLowerCase()))
    .filter((b): b is { id: string; name: string } => !!b)
    .map((b) => b.id);
}

/**
 * Retorna o baseId principal para previsão do tempo e dados históricos.
 * Para regionais com sucursais, usa a primeira sucursal disponível.
 * Para regionais sem sucursais, usa a própria base.
 */
export function getPrimaryBaseId(
  regionalLabel: string,
  allBases: { id: string; name: string }[],
  selectedSucursal?: string | null
): string | null {
  const ids = getBaseIdsForRegional(regionalLabel, allBases, selectedSucursal);
  return ids[0] ?? null;
}
