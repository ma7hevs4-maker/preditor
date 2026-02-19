/**
 * Mapeamento fixo de Bases e suas Sucursais.
 * Cada "Base" pode ter zero ou mais sucursais.
 * O nome da sucursal é usado para filtrar/somar estruturas declaradas.
 */

export interface Sucursal {
  /** Nome da sucursal (cidade) */
  name: string;
  /** Corresponde ao campo "name" da tabela bases no Supabase */
  baseName: string;
}

export interface BaseConfig {
  /** Nome da base/regional */
  name: string;
  /** Lista de sucursais, vazia se não houver subdivisão */
  sucursais: Sucursal[];
}

/**
 * Mapeamento: nome da base (como cadastrado no banco) → configuração.
 * Para bases SEM sucursais, deixar sucursais vazio [].
 * Para bases COM sucursais, listar cada sucursal com seu baseName exato do banco.
 */
export const BASE_CONFIGS: BaseConfig[] = [
  {
    name: "Campos",
    sucursais: [],
  },
  {
    name: "Macaé",
    sucursais: [],
  },
  {
    name: "Lagos",
    sucursais: [
      { name: "Araruama", baseName: "Lagos - Araruama" },
      { name: "Cabo Frio", baseName: "Lagos - Cabo Frio" },
    ],
  },
  {
    name: "Noroeste",
    sucursais: [
      { name: "Cantagalo", baseName: "Noroeste - Cantagalo" },
      { name: "Itaperuna", baseName: "Noroeste - Itaperuna" },
      { name: "Pádua", baseName: "Noroeste - Pádua" },
    ],
  },
  {
    name: "Magé",
    sucursais: [],
  },
  {
    name: "Niterói",
    sucursais: [
      { name: "Niterói", baseName: "Niterói - Niterói" },
      { name: "Maricá", baseName: "Niterói - Maricá" },
    ],
  },
  {
    name: "São Gonçalo",
    sucursais: [],
  },
  {
    name: "Serrana",
    sucursais: [
      { name: "Petrópolis", baseName: "Serrana - Petrópolis" },
      { name: "Teresópolis", baseName: "Serrana - Teresópolis" },
    ],
  },
  {
    name: "Sul",
    sucursais: [
      { name: "Angra dos Reis", baseName: "Sul - Angra dos Reis" },
      { name: "Resende", baseName: "Sul - Resende" },
    ],
  },
];

/**
 * Dado o nome de uma base do banco, retorna a BaseConfig correspondente.
 * A correspondência é feita pelo campo name da base ou pelo baseName de alguma sucursal.
 */
export function findBaseConfig(baseName: string): BaseConfig | undefined {
  // Match direto por nome da base
  const direct = BASE_CONFIGS.find(
    (bc) => bc.name.toLowerCase() === baseName.toLowerCase()
  );
  if (direct) return direct;

  // Match por nome de sucursal
  return BASE_CONFIGS.find((bc) =>
    bc.sucursais.some(
      (s) => s.baseName.toLowerCase() === baseName.toLowerCase()
    )
  );
}

/**
 * Dado uma base (do banco) e lista de todas as bases do banco,
 * retorna os IDs das bases que são sucursais dela (ou ela mesma se não tiver sucursais).
 */
export function getRelatedBaseIds(
  selectedBase: { id: string; name: string },
  allBases: { id: string; name: string }[],
  selectedSucursalName?: string | null
): string[] {
  const config = findBaseConfig(selectedBase.name);

  // Sem sucursais configuradas → retorna só ela mesma
  if (!config || config.sucursais.length === 0) {
    return [selectedBase.id];
  }

  // Sucursal específica selecionada
  if (selectedSucursalName && selectedSucursalName !== "todas") {
    const sucursal = config.sucursais.find((s) => s.name === selectedSucursalName);
    if (!sucursal) return [selectedBase.id];
    const matchedBase = allBases.find(
      (b) => b.name.toLowerCase() === sucursal.baseName.toLowerCase()
    );
    return matchedBase ? [matchedBase.id] : [selectedBase.id];
  }

  // "Todas" as sucursais → retorna IDs de todas
  const ids: string[] = [];
  for (const sucursal of config.sucursais) {
    const matched = allBases.find(
      (b) => b.name.toLowerCase() === sucursal.baseName.toLowerCase()
    );
    if (matched) ids.push(matched.id);
  }
  // Se nenhuma sucursal foi encontrada no banco, cai de volta para a base principal
  return ids.length > 0 ? ids : [selectedBase.id];
}
