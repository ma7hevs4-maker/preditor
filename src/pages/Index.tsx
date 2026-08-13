import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/Header";
import { KPICard } from "@/components/KPICard";
import { WeatherIndicator } from "@/components/WeatherIndicator";
import { TeamsDisplay } from "@/components/TeamsDisplay";
import { PlanningTable } from "@/components/PlanningTable";
import { IncidentChart } from "@/components/IncidentChart";
import { ConfigPanel } from "@/components/ConfigPanel";
import { WeatherOverride } from "@/components/WeatherOverrideDialog";
import { OperationalOverride } from "@/components/OperationalOverrideDialog";
import { AlertTriangle, TrendingDown, Users, Zap, Loader2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { useBases } from "@/hooks/useBases";
import { useAggregatedHistoricalData } from "@/hooks/useHistoricalData";
import { useWeather } from "@/hooks/useWeather";
import { useSimulation, SimulationConfig, SimulationRow } from "@/hooks/useSimulation";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useWeatherProvider } from "@/hooks/useWeatherProvider";
import { useWeatherImpact } from "@/hooks/useWeatherImpact";
import { useSimulationHistory, SimulationHistoryEntry, SaveSimulationParams } from "@/hooks/useSimulationHistory";
import { useWeatherTriggers } from "@/hooks/useWeatherTriggers";
import { useDecayCurves } from "@/hooks/useDecayCurves";
import { format } from "date-fns";

const defaultTeamsPerHour = [
  0, 0, 0, 0, 0, 0, 0, 0, // Turno A (0-7h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno B (8-15h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno C (16-23h)
];

const defaultLossTeamsPerHour = [
  0, 0, 0, 0, 0, 0, 0, 0, // Turno A (0-7h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno B (8-15h)
  0, 0, 0, 0, 0, 0, 0, 0, // Turno C (16-23h)
];

const Index = () => {
  const [config, setConfig] = useState<SimulationConfig>({
    baseId: "",
    btInitialBacklog: 0,
    mtInitialBacklog: 0,
    teamsPerHour: [...defaultTeamsPerHour],
    lossTeamsPerHour: [...defaultLossTeamsPerHour],
    teamsPerHourDay2: [...defaultTeamsPerHour],
    lossTeamsPerHourDay2: [...defaultLossTeamsPerHour],
    teamsPerHourDay3: [...defaultTeamsPerHour],
    lossTeamsPerHourDay3: [...defaultLossTeamsPerHour],
    horizonHours: 24,
  });
  const [simulationKey, setSimulationKey] = useState(0);
  const [loadedSimulation, setLoadedSimulation] = useState<SimulationRow[] | null>(null);
  const currentHour = new Date().getHours();

  // Fetch bases from Supabase
  const { data: bases, isLoading: basesLoading } = useBases();
  
  // Fetch system settings
  const { data: systemSettings } = useSystemSettings();
  
  // Set first base as default when loaded
  useEffect(() => {
    if (bases && bases.length > 0 && !config.baseId) {
      setConfig(prev => ({ ...prev, baseId: bases[0].id }));
    }
  }, [bases, config.baseId]);

  const selectedBase = bases?.find(b => b.id === config.baseId);

  // Fetch historical data (agregado quando há várias sucursais)
  const historicalBaseIds = useMemo(
    () =>
      config.aggregateBaseIds && config.aggregateBaseIds.length > 0
        ? config.aggregateBaseIds
        : config.baseId
        ? [config.baseId]
        : [],
    [config.aggregateBaseIds, config.baseId]
  );
  const { data: historicalData, isLoading: historicalLoading } =
    useAggregatedHistoricalData(historicalBaseIds);

  // Fetch weather triggers for selected base
  const { data: weatherTriggers } = useWeatherTriggers(config.baseId || null);
  const { data: decayCurves } = useDecayCurves(config.baseId || null);

  // Weather provider state
  const { provider: weatherProvider, setProvider: setWeatherProvider } = useWeatherProvider();

  // Weather impact toggle
  const { enabled: weatherImpactEnabled, setEnabled: setWeatherImpactEnabled } = useWeatherImpact();

  // Operational override for simulation testing
  const [operationalOverride, setOperationalOverride] = useState<OperationalOverride>({
    enabled: false,
    overrides: {},
  });

  // Weather override for simulation testing
  const [weatherOverride, setWeatherOverride] = useState<WeatherOverride>({
    enabled: false,
    precip_mm: 0,
    wind_kmh: 10,
    gust_kmh: 15,
    temp_c: 25,
    startDay: 1,
    startHour: 0,
    endDay: 1,
    endHour: 23,
    untilEnd: true,
  });

  // Fetch weather forecast
  const { 
    data: weatherData, 
    isLoading: weatherLoading, 
    isError: weatherError 
  } = useWeather(
    selectedBase?.lat || null, 
    selectedBase?.lon || null, 
    config.horizonHours,
    weatherProvider
  );

  // Ensure stable reference for weatherTriggers - use empty array while loading
  const stableWeatherTriggers = useMemo(() => weatherTriggers ?? [], [weatherTriggers]);

  // Create effective weather forecast - use override if enabled
  const effectiveWeatherForecast = useMemo(() => {
    if (weatherOverride.enabled && weatherData?.forecast) {
      // Convert day/hour selection to array index
      // Array index i represents: hour = (currentHour + i) % 24, day = floor((currentHour + i) / 24)
      // So to find index for (targetDay, targetHour):
      // We need index where: floor((currentHour + index) / 24) == targetDay AND (currentHour + index) % 24 == targetHour
      // Solving: index = targetDay * 24 + targetHour - currentHour
      
      const getHourIndex = (day: number, hour: number) => {
        // Day is a calendar day (Dia 1 = today), not a 24-hour block from now.
        // Example at 18h: Dia 2 às 00h is index 6, not index 30.
        return (day - 1) * 24 + hour - currentHour;
      };
      
      const startHourIndex = getHourIndex(weatherOverride.startDay, weatherOverride.startHour);
      const endHourIndex = weatherOverride.untilEnd 
        ? config.horizonHours - 1
        : getHourIndex(weatherOverride.endDay, weatherOverride.endHour);
      
      return weatherData.forecast.map((hour, index) => {
        // Check if this hour falls within the override period
        if (startHourIndex >= 0 && index >= startHourIndex && index <= endHourIndex) {
          return {
            ...hour,
            precip_mm: weatherOverride.precip_mm,
            wind_kmh: weatherOverride.wind_kmh,
            gust_kmh: weatherOverride.gust_kmh,
            temp_c: weatherOverride.temp_c,
          };
        }
        return hour;
      });
    }
    return weatherData?.forecast;
  }, [weatherData?.forecast, weatherOverride, config.horizonHours, currentHour]);
  
  // Run simulation
  const liveSimulationData = useSimulation(
    config,
    historicalData,
    effectiveWeatherForecast,
    systemSettings,
    weatherImpactEnabled,
    stableWeatherTriggers,
    operationalOverride.enabled ? operationalOverride : undefined,
    decayCurves
  );

  // Use loaded simulation or live data
  const simulationData = loadedSimulation || liveSimulationData;

  const handleConfigChange = (newConfig: SimulationConfig) => {
    setConfig(newConfig);
    setLoadedSimulation(null); // Clear loaded simulation when config changes
  };

  const handleCalculate = () => {
    setSimulationKey((prev) => prev + 1);
    setLoadedSimulation(null); // Clear loaded simulation
    toast({
      title: "Simulação Calculada",
      description: `Horizonte: ${config.horizonHours}h | Base: ${selectedBase?.name || "N/A"}`,
    });
  };

  const handleLoadSimulation = useCallback((entry: SimulationHistoryEntry) => {
    // Load the simulation config
    setConfig(prev => ({
      ...prev,
      baseId: entry.base_id,
      btInitialBacklog: entry.bt_initial_backlog,
      mtInitialBacklog: entry.mt_initial_backlog,
      horizonHours: entry.horizon_hours,
    }));
    
    // Set weather settings
    setWeatherProvider(entry.weather_provider);
    setWeatherImpactEnabled(entry.weather_impact_enabled);
    
    // Load the saved simulation results
    setLoadedSimulation(entry.results_snapshot);
  }, [setWeatherProvider, setWeatherImpactEnabled]);

  // Save simulation hook — filter history by regional or base
  const { saveSimulation } = useSimulationHistory(config.baseId, config.regionalLabel);

  const handleSaveSimulation = useCallback(async () => {
    if (!config.baseId || liveSimulationData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhuma simulação para salvar",
        variant: "destructive",
      });
      return;
    }

    const params: SaveSimulationParams = {
      baseId: config.baseId,
      regionalLabel: config.regionalLabel ?? null,
      name: `Simulação ${format(new Date(), "dd/MM HH:mm")}`,
      btInitialBacklog: config.btInitialBacklog,
      mtInitialBacklog: config.mtInitialBacklog,
      horizonHours: config.horizonHours,
      weatherProvider: weatherProvider,
      weatherImpactEnabled: weatherImpactEnabled,
      resultsSnapshot: liveSimulationData,
      weatherSnapshot: weatherData?.forecast,
    };

    try {
      await saveSimulation.mutateAsync(params);
      toast({
        title: "Simulação Salva",
        description: "Você pode acessá-la no histórico",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a simulação",
        variant: "destructive",
      });
    }
  }, [config, liveSimulationData, weatherProvider, weatherImpactEnabled, weatherData?.forecast, saveSimulation]);

  // Loading state
  if (basesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando bases...</span>
        </div>
      </div>
    );
  }

  // Check if simulation has meaningful input (backlog or teams configured)
  const hasBacklog = config.btInitialBacklog > 0 || config.mtInitialBacklog > 0;
  const hasTeams = config.teamsPerHour.some(t => t > 0) || 
                   config.lossTeamsPerHour.some(t => t > 0) ||
                   config.teamsPerHourDay2.some(t => t > 0) ||
                   config.lossTeamsPerHourDay2.some(t => t > 0) ||
                   config.teamsPerHourDay3.some(t => t > 0) ||
                   config.lossTeamsPerHourDay3.some(t => t > 0);
  const hasSimulationInput = hasBacklog || hasTeams;

  // Get current data for KPIs (first row or defaults)
  const currentData = simulationData[0] || {
    incidentes_bt_saldo: 0,
    incidentes_mt_saldo: 0,
    eq_bt_add: 0,
    eq_mt_add: 0,
    precip_mm: 0,
    wind_kmh: 0,
    gust_kmh: 0,
    temp_c: 25,
  };

  // Calculate totals - show 0 if no meaningful simulation input
  const displayBtSaldo = hasSimulationInput ? currentData.incidentes_bt_saldo : 0;
  const displayMtSaldo = hasSimulationInput ? currentData.incidentes_mt_saldo : 0;
  // Backlog total = soma dos saldos BT + MT (KPIs previstos)
  const totalBacklog = displayBtSaldo + displayMtSaldo;
  
  // Equipes adicionais - baseado no saldo FINAL da simulação vs metas
  const getSettingValue = (key: string, defaultValue: number): number => {
    const setting = systemSettings?.find(s => s.key === key);
    return setting ? parseFloat(setting.value) : defaultValue;
  };
  const TARGET_BT = getSettingValue("bt_target", 70);
  const TARGET_MT = getSettingValue("mt_target", 10);
  const finalData = simulationData[simulationData.length - 1];
  
  // Se já atingiu a meta no final do horizonte, calcula excesso (negativo) ou necessidade (positivo)
  const finalBtSaldo = finalData?.incidentes_bt_saldo ?? 0;
  const finalMtSaldo = finalData?.incidentes_mt_saldo ?? 0;
  const finalTotalBacklog = finalBtSaldo + finalMtSaldo; // Total no final do horizonte para contingência
  
  // Gap pode ser negativo (excesso de equipes) ou positivo (falta equipes)
  const gapBt = hasSimulationInput ? finalBtSaldo - TARGET_BT : 0;
  const gapMt = hasSimulationInput ? finalMtSaldo - TARGET_MT : 0;
  const totalGap = gapBt + gapMt;
  
  // Calcula capacidade média real usando dados históricos
  // bt_productivity média ≈ 2.81, mt_productivity ≈ 1.47
  // Capacidade = produtividade / 8
  const avgBtProd = historicalData?.reduce((sum, h) => sum + h.bt_productivity, 0) / (historicalData?.length || 1) || 2.81;
  const avgMtProd = historicalData?.reduce((sum, h) => sum + h.mt_productivity, 0) / (historicalData?.length || 1) || 1.47;
  
  // Capacidade combinada (usa média simples quando gap é negativo ou zero)
  const absGapBt = Math.abs(gapBt);
  const absGapMt = Math.abs(gapMt);
  const totalAbsGap = absGapBt + absGapMt;
  const weightedCap = totalAbsGap > 0 
    ? ((absGapBt / totalAbsGap) * (avgBtProd / 8) + (absGapMt / totalAbsGap) * (avgMtProd / 8))
    : (avgBtProd / 8);
  
  // Equipes adicionais por hora (positivo = precisa adicionar, negativo = pode remover)
  const avgEquipesAddPerHour = (config.horizonHours > 0 && hasSimulationInput && totalGap !== 0)
    ? Math.ceil(totalGap / (config.horizonHours * weightedCap)) 
    : 0;

  const weatherStatus = weatherLoading ? "loading" : weatherError ? "error" : "success";

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto">
        <Header
          config={config}
          selectedBase={selectedBase}
          onConfigChange={handleConfigChange}
          onCalculate={handleCalculate}
          weatherStatus={weatherStatus}
          weatherProvider={weatherProvider}
          onWeatherProviderChange={setWeatherProvider}
          weatherImpactEnabled={weatherImpactEnabled}
          onWeatherImpactChange={setWeatherImpactEnabled}
          onLoadSimulation={handleLoadSimulation}
          onSaveSimulation={handleSaveSimulation}
          isSaving={saveSimulation.isPending}
          weatherOverride={weatherOverride}
          onWeatherOverrideChange={setWeatherOverride}
          operationalOverride={operationalOverride}
          onOperationalOverrideChange={setOperationalOverride}
          totalIncidents={hasSimulationInput ? finalTotalBacklog : 0}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Backlog Total"
            value={totalBacklog}
            subtitle="BT + MT combinados"
            icon={AlertTriangle}
            variant={totalBacklog > 165 ? "destructive" : totalBacklog > 80 ? "warning" : "success"}
          />
          <KPICard
            title="Incidentes BT"
            value={displayBtSaldo}
            subtitle="Saldo atual previsto"
            icon={Zap}
            variant={
              displayBtSaldo > 150
                ? "destructive"
                : displayBtSaldo > 70
                ? "warning"
                : "success"
            }
          />
          <KPICard
            title="Incidentes MT"
            value={displayMtSaldo}
            subtitle="Saldo atual previsto"
            icon={TrendingDown}
            variant={
              displayMtSaldo > 15
                ? "destructive"
                : displayMtSaldo > 10
                ? "warning"
                : "success"
            }
          />
          <KPICard
            title="Equipes Adicionais"
            value={avgEquipesAddPerHour >= 0 ? `+${avgEquipesAddPerHour}` : `${avgEquipesAddPerHour}`}
            subtitle={avgEquipesAddPerHour < 0 ? "Excesso por hora (pode reduzir)" : "Média por hora no período"}
            icon={Users}
            variant={avgEquipesAddPerHour <= 0 ? "success" : avgEquipesAddPerHour > 10 ? "warning" : "default"}
          />
        </div>

        {/* Weather + Teams */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
          <div className="xl:col-span-2">
            <WeatherIndicator
              precip_mm={currentData.precip_mm}
              wind_kmh={currentData.wind_kmh}
              gust_kmh={currentData.gust_kmh}
              temp_c={currentData.temp_c}
              lat={selectedBase?.lat}
              lon={selectedBase?.lon}
              baseName={selectedBase?.name}
              baseId={config.baseId || null}
            />
          </div>
          <div className="xl:col-span-2">
            <TeamsDisplay 
              teamsPerHour={config.teamsPerHour} 
              currentHour={currentHour}
            />
          </div>
        </div>

        {/* Chart + Config Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
          <div className="xl:col-span-3">
            {historicalLoading ? (
              <div className="glass-card p-8 flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span>Carregando dados históricos...</span>
              </div>
            ) : (
              <IncidentChart data={simulationData} />
            )}
          </div>
          <div className="xl:col-span-1">
            <ConfigPanel config={config} simulationData={simulationData} className="h-full" />
          </div>
        </div>

        {/* Full Width Planning Table */}
        {!historicalLoading && (
          <PlanningTable data={simulationData} baseName={selectedBase?.name} />
        )}
      </div>
    </div>
  );
};

export default Index;
