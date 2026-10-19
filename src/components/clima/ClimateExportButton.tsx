import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Base } from "@/hooks/useBases";
import { useHistoricalData, useActiveSeason, SEASON_LABEL } from "@/hooks/useHistoricalData";
import { useWeather } from "@/hooks/useWeather";
import { useWeatherTriggers, isTriggerActive } from "@/hooks/useWeatherTriggers";
import { REGIONAIS, getBaseIdsForRegional } from "@/data/basesConfig";
import { calculateOperationalHours, consolidatePoloHours, operationalExportColumns, sumOperationalMetrics, OperationalHour } from "@/utils/climateOperationalExport";

type Snapshot = { hours: OperationalHour[]; loading: boolean; error: boolean };
type Props = { bases: Base[]; polos: string[]; ut: string; date: string; provider: "openmeteo" | "openweathermap" };

function BaseExportData({ base, date, provider, onData }: {
  base: Base; date: string; provider: Props["provider"]; onData: (id: string, data: Snapshot) => void;
}) {
  const weather = useWeather(base.lat, base.lon, 168, provider, "day");
  const history = useHistoricalData(base.id);
  const triggers = useWeatherTriggers(base.id);
  useEffect(() => {
    const day = weather.data?.forecast.filter(hour => hour.datetime.slice(0, 10) === date) ?? [];
    const hours = calculateOperationalHours(day, history.data ?? [], hour =>
      (triggers.data ?? []).filter(t => isTriggerActive(t, hour.precip_mm, hour.wind_kmh, hour.temp_c, hour.gust_kmh)));
    onData(base.id, {
      hours,
      loading: weather.isPending || history.isPending || triggers.isPending,
      error: weather.isError || history.isError || triggers.isError || hours.length !== 24 || new Set(hours.map(h => h.hour)).size !== 24,
    });
  }, [base.id, date, weather.data, weather.isPending, weather.isError, history.data, history.isPending, history.isError, triggers.data, triggers.isPending, triggers.isError, onData]);
  return null;
}

function ExportSession({ bases, polos, ut, date, provider }: Props) {
  const season = useActiveSeason();
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [saving, setSaving] = useState(false);
  const groups = useMemo(() => polos.map(polo => ({ polo, ids: getBaseIdsForRegional(polo, bases) })), [polos, bases]);
  const selectedBases = bases.filter(base => groups.some(group => group.ids.includes(base.id)));
  const onData = useCallback((id: string, data: Snapshot) => setSnapshots(prev => ({ ...prev, [id]: data })), []);
  const loading = !selectedBases.length || selectedBases.some(base => !snapshots[base.id] || snapshots[base.id].loading);

  const download = () => {
    const incomplete = groups.filter(group => {
      const regional = REGIONAIS.find(r => r.label === group.polo);
      const expected = regional?.sucursais.length || 1;
      return group.ids.length !== expected || group.ids.some(id => snapshots[id]?.error || !snapshots[id]);
    });
    if (incomplete.length) {
      toast.error(`Dados incompletos para: ${incomplete.map(g => g.polo).join(", ")}. Aguarde ou atualize a previsão antes de exportar.`);
      return;
    }
    setSaving(true);
    try {
      const context = { UT: ut, Data: date, "Estação histórica": SEASON_LABEL[season] };
      const consolidated = groups.map(group => ({
        polo: group.polo,
        hours: consolidatePoloHours(group.ids.map(id => snapshots[id]?.hours ?? [])),
      }));
      const daily = consolidated.map(group => ({ ...context, Polo: group.polo, ...operationalExportColumns(sumOperationalMetrics(group.hours)) }));
      const hourly = consolidated.flatMap(group => group.hours.map(hour => ({
        ...context, Polo: group.polo, Hora: `${String(hour.hour).padStart(2, "0")}:00`, ...operationalExportColumns(hour),
      })));
      const workbook = XLSX.utils.book_new();
      for (const [title, rows] of [["Resumo por Polo", daily], ["Dados por Hora", hourly]] as const) {
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet["!cols"] = Object.keys(rows[0] ?? {}).map(key => ({ wch: Math.max(14, key.length + 2) }));
        for (const [address, cell] of Object.entries(sheet)) {
          if (!address.startsWith("!") && cell.t === "n") cell.z = "0.00";
        }
        XLSX.utils.book_append_sheet(workbook, sheet, title);
      }
      XLSX.writeFile(workbook, `Central_Climatica_${ut}_${date}.xlsx`);
    } catch {
      toast.error("Não foi possível baixar a planilha. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    {selectedBases.map(base => <BaseExportData key={base.id} base={base} date={date} provider={provider} onData={onData} />)}
    <Button variant="outline" size="sm" onClick={download} disabled={loading || saving} className="gap-2" aria-label={`Exportar dados ${ut}`}>
      {loading || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Exportar dados {ut}
    </Button>
  </>;
}

export function ClimateExportButton(props: Props) {
  const season = useActiveSeason();
  return <ExportSession key={`${props.ut}-${props.date}-${props.provider}-${season}`} {...props} />;
}