import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { KPICard } from "@/components/KPICard";
import { WeatherIndicator } from "@/components/WeatherIndicator";
import { TeamsDisplay } from "@/components/TeamsDisplay";
import { PlanningTable } from "@/components/PlanningTable";
import { IncidentChart } from "@/components/IncidentChart";
import { ConfigPanel } from "@/components/ConfigPanel";
import { AlertTriangle, TrendingDown, Users, Zap, Loader2 } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { useBases } from "@/hooks/useBases";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { useWeather } from "@/hooks/useWeather";
import { useSimulation, SimulationConfig } from "@/hooks/useSimulation";

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
    horizonHours: 24,
  });
  const [simulationKey, setSimulationKey] = useState(0);

  const currentHour = new Date().getHours();

  // Fetch bases from Supabase
  const { data: bases, isLoading: basesLoading } = useBases();
  
  // Set first base as default when loaded
  useEffect(() => {
    if (bases && bases.length > 0 && !config.baseId) {
      setConfig(prev => ({ ...prev, baseId: bases[0].id }));
    }
  }, [bases, config.baseId]);

  const selectedBase = bases?.find(b => b.id === config.baseId);

  // Fetch historical data for selected base
  const { data: historicalData, isLoading: historicalLoading } = useHistoricalData(config.baseId);

  // Fetch weather forecast
  const { 
    data: weatherData, 
    isLoading: weatherLoading, 
    isError: weatherError 
  } = useWeather(
    selectedBase?.lat || null, 
    selectedBase?.lon || null, 
    config.horizonHours
  );

  // Run simulation
  const simulationData = useSimulation(
    config,
    historicalData,
    weatherData?.forecast
  );

  const handleConfigChange = (newConfig: SimulationConfig) => {
    setConfig(newConfig);
  };

  const handleCalculate = () => {
    setSimulationKey((prev) => prev + 1);
    toast({
      title: "Simulação Calculada",
      description: `Horizonte: ${config.horizonHours}h | Base: ${selectedBase?.name || "N/A"}`,
    });
  };

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

  // Get current data for KPIs (first row or defaults)
  const currentData = simulationData[0] || {
    incidentes_bt_saldo: 0,
    incidentes_mt_saldo: 0,
    eq_bt_add: 0,
    eq_mt_add: 0,
    precip_mm: 0,
    wind_ms: 0,
    temp_c: 25,
  };

  // Calculate totals
  const totalBacklog = currentData.incidentes_bt_saldo + currentData.incidentes_mt_saldo;
  
  // Equipes adicionais baseado no saldo FINAL vs meta
  const TARGET_BT = 70;
  const TARGET_MT = 10;
  const finalData = simulationData[simulationData.length - 1];
  
  // Calcula gap TOTAL do saldo final em relação às metas
  const gapBt = finalData ? Math.max(0, finalData.incidentes_bt_saldo - TARGET_BT) : 0;
  const gapMt = finalData ? Math.max(0, finalData.incidentes_mt_saldo - TARGET_MT) : 0;
  const totalGap = gapBt + gapMt;
  
  // Capacidade média por equipe por hora (baseado nos dados reais da simulação)
  // Olhando a tabela: com 50 equipes, cap_bt_h ≈ 12, então cap/equipe ≈ 0.24
  // Produtividade real é ~2 incidentes/equipe/8h = 0.25/h
  const CAP_PER_TEAM = 0.25;
  
  // Equipes adicionais por hora = gap total / (horas * capacidade por equipe)
  const avgEquipesAddPerHour = totalGap > 0 
    ? Math.ceil(totalGap / (config.horizonHours * CAP_PER_TEAM)) 
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
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Backlog Total"
            value={totalBacklog}
            subtitle="BT + MT combinados"
            icon={AlertTriangle}
            variant={totalBacklog > 30 ? "destructive" : totalBacklog > 15 ? "warning" : "success"}
          />
          <KPICard
            title="Incidentes BT"
            value={currentData.incidentes_bt_saldo}
            subtitle="Saldo atual previsto"
            icon={Zap}
            variant={
              currentData.incidentes_bt_saldo > 25
                ? "destructive"
                : currentData.incidentes_bt_saldo > 15
                ? "warning"
                : "default"
            }
          />
          <KPICard
            title="Incidentes MT"
            value={currentData.incidentes_mt_saldo}
            subtitle="Saldo atual previsto"
            icon={TrendingDown}
            variant={
              currentData.incidentes_mt_saldo > 5
                ? "destructive"
                : currentData.incidentes_mt_saldo > 2
                ? "warning"
                : "default"
            }
          />
          <KPICard
            title="Equipes Adicionais"
            value={`+${avgEquipesAddPerHour}`}
            subtitle="Média por hora no período"
            icon={Users}
            variant={avgEquipesAddPerHour > 10 ? "warning" : "default"}
          />
        </div>

        {/* Weather + Teams */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
          <div className="xl:col-span-2">
            <WeatherIndicator
              precip_mm={currentData.precip_mm}
              wind_ms={currentData.wind_ms}
              temp_c={currentData.temp_c}
              lat={selectedBase?.lat}
              lon={selectedBase?.lon}
              baseName={selectedBase?.name}
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
            <ConfigPanel config={config} className="h-full" />
          </div>
        </div>

        {/* Full Width Planning Table */}
        {!historicalLoading && (
          <PlanningTable data={simulationData} />
        )}
      </div>
    </div>
  );
};

export default Index;
