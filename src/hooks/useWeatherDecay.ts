import { WeatherHour } from "./useWeather";
import { WeatherTrigger, isTriggerActive } from "./useWeatherTriggers";
import { DecayCurve, DECAY_HOUR_KEYS } from "./useDecayCurves";

export const MAX_DECAY_HOURS = 12;

export interface ResidualSource {
  name: string;
  type: string;
  hoursSince: number;
  btPct: number;
  mtPct: number;
}

export interface HourUpliftInfo {
  /** uplift final (fração, ex: 0.10 = +10%) = gatilhos ativos + residual das curvas */
  upliftBT: number;
  upliftMT: number;
  /** uplift somente dos gatilhos ativos nesta hora */
  rawBT: number;
  rawMT: number;
  /** parte residual (decay) */
  residualBT: number;
  residualMT: number;
  activeNames: string[];
  residualSources: ResidualSource[];
}

const curveKey = (type: string, name: string, level: string) => `${type}|${name}|${level}`;

/** Mapa de curvas: "tipo|nome|nivel" -> [%h+1 ... %h+12] */
export const buildCurveMap = (curves: DecayCurve[] | undefined): Map<string, number[]> => {
  const map = new Map<string, number[]>();
  (curves ?? []).forEach((c) => {
    map.set(
      curveKey(c.trigger_type, c.trigger_name, (c.level || "").toUpperCase()),
      DECAY_HOUR_KEYS.map((k) => Number(c[k] ?? 0))
    );
  });
  return map;
};

/**
 * Calcula o uplift horário usando curvas de decay explícitas por base/nível/gatilho.
 * Regra: enquanto um gatilho de um tipo (chuva, rajada, temperatura) está ativo,
 * vale o impacto do gatilho. Quando deixa de estar ativo, aplica-se a curva do
 * último gatilho daquele tipo, hora a hora (+1h ... +12h).
 */
export const computeWeatherUplifts = (
  weatherData: WeatherHour[] | undefined,
  triggers: WeatherTrigger[] | undefined,
  curves: DecayCurve[] | undefined,
  hours?: number
): HourUpliftInfo[] => {
  const total = hours ?? weatherData?.length ?? 0;
  const curveMap = buildCurveMap(curves);
  const result: HourUpliftInfo[] = [];
  // último gatilho ativo por tipo
  const lastActive = new Map<string, { name: string; index: number }>();

  for (let i = 0; i < total; i++) {
    const w = weatherData?.[i];
    const precip = w?.precip_mm ?? 0;
    const wind = w?.wind_kmh ?? 0;
    const temp = w?.temp_c ?? 25;
    const gust = w?.gust_kmh;

    const active = (triggers ?? []).filter((t) => isTriggerActive(t, precip, wind, temp, gust));
    const activeTypes = new Set(active.map((t) => t.trigger_type));

    let rawBT = 0;
    let rawMT = 0;
    active.forEach((t) => {
      rawBT += Number(t.impact_percent_bt ?? t.impact_percent ?? 0);
      rawMT += Number(t.impact_percent_mt ?? t.impact_percent ?? 0);
      lastActive.set(t.trigger_type, { name: t.name, index: i });
    });

    let residualBT = 0;
    let residualMT = 0;
    const residualSources: ResidualSource[] = [];

    lastActive.forEach((last, type) => {
      if (activeTypes.has(type)) return; // gatilho ainda ativo: sem residual
      const hoursSince = i - last.index;
      if (hoursSince < 1 || hoursSince > MAX_DECAY_HOURS) return;
      const bt = curveMap.get(curveKey(type, last.name, "BT"))?.[hoursSince - 1] ?? 0;
      const mt = curveMap.get(curveKey(type, last.name, "MT"))?.[hoursSince - 1] ?? 0;
      if (bt === 0 && mt === 0) return;
      residualBT += bt;
      residualMT += mt;
      residualSources.push({ name: last.name, type, hoursSince, btPct: bt, mtPct: mt });
    });

    result.push({
      upliftBT: (rawBT + residualBT) / 100,
      upliftMT: (rawMT + residualMT) / 100,
      rawBT: rawBT / 100,
      rawMT: rawMT / 100,
      residualBT: residualBT / 100,
      residualMT: residualMT / 100,
      activeNames: active.map((t) => t.name),
      residualSources,
    });
  }

  return result;
};
