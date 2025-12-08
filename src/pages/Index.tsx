import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { KPICard } from "@/components/KPICard";
import { WeatherIndicator } from "@/components/WeatherIndicator";
import { TurnoIndicator } from "@/components/TurnoIndicator";
import { PlanningTable } from "@/components/PlanningTable";
import { IncidentChart } from "@/components/IncidentChart";
import { ConfigPanel } from "@/components/ConfigPanel";
import { generatePlanningData, defaultConfig, PlanningConfig } from "@/data/mockPlanningData";
import { AlertTriangle, TrendingDown, Users, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [config, setConfig] = useState<PlanningConfig>(defaultConfig);
  const [planningKey, setPlanningKey] = useState(0);

  const currentHour = new Date().getHours();
  const currentTurno = currentHour <= 7 ? "A" : currentHour <= 15 ? "B" : "C";

  // Generate planning data based on current config
  const hourlyData = useMemo(() => {
    return generatePlanningData(config, currentHour);
  }, [config, planningKey, currentHour]);

  const handleConfigChange = (newConfig: PlanningConfig) => {
    setConfig(newConfig);
  };

  const handleCalculate = () => {
    setPlanningKey((prev) => prev + 1);
    toast({
      title: "Planejamento Calculado",
      description: `Dados atualizados com Backlog BT: ${config.backlog_bt}, MT: ${config.backlog_mt}`,
    });
  };

  // Get current/latest data for KPIs
  const currentData = hourlyData[0] || {
    incidentes_bt_saldo_disp: 0,
    incidentes_mt_saldo_disp: 0,
    eq_bt_add_dist: 0,
    eq_mt_add_dist: 0,
    precip_mm: 0,
    wind_ms: 0,
    temp_c: 25,
  };

  // Calculate totals
  const totalBacklog =
    currentData.incidentes_bt_saldo_disp + currentData.incidentes_mt_saldo_disp;
  const totalEquipesAdd = hourlyData.reduce(
    (acc, row) => acc + row.eq_bt_add_dist + row.eq_mt_add_dist,
    0
  );
  const avgRain =
    hourlyData.length > 0
      ? hourlyData.reduce((acc, row) => acc + row.precip_mm, 0) / hourlyData.length
      : 0;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto">
        <Header
          config={config}
          onConfigChange={handleConfigChange}
          onCalculate={handleCalculate}
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
            value={currentData.incidentes_bt_saldo_disp}
            subtitle="Saldo atual (disponível)"
            icon={Zap}
            variant={
              currentData.incidentes_bt_saldo_disp > 25
                ? "destructive"
                : currentData.incidentes_bt_saldo_disp > 15
                ? "warning"
                : "default"
            }
          />
          <KPICard
            title="Incidentes MT"
            value={currentData.incidentes_mt_saldo_disp}
            subtitle="Saldo atual (disponível)"
            icon={TrendingDown}
            variant={
              currentData.incidentes_mt_saldo_disp > 5
                ? "destructive"
                : currentData.incidentes_mt_saldo_disp > 2
                ? "warning"
                : "default"
            }
          />
          <KPICard
            title="Equipes Adicionais"
            value={`+${totalEquipesAdd}`}
            subtitle="Necessárias (cenário ideal)"
            icon={Users}
            variant={totalEquipesAdd > 10 ? "warning" : "default"}
          />
        </div>

        {/* Weather + Turnos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <WeatherIndicator
              precip_mm={avgRain}
              wind_ms={currentData.wind_ms}
              temp_c={currentData.temp_c}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["A", "B", "C"] as const).map((turno) => (
              <TurnoIndicator
                key={turno}
                turno={turno}
                isActive={turno === currentTurno}
                equipesBT={config.equipes_bt[turno]}
                equipesMT={config.equipes_mt[turno]}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <Tabs defaultValue="BT" className="w-full">
              <TabsList className="glass-card p-1 mb-4">
                <TabsTrigger
                  value="BT"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Baixa Tensão (BT)
                </TabsTrigger>
                <TabsTrigger
                  value="MT"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                >
                  Média Tensão (MT)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="BT" className="space-y-6 mt-0">
                <IncidentChart data={hourlyData} type="BT" />
                <PlanningTable data={hourlyData} type="BT" />
              </TabsContent>

              <TabsContent value="MT" className="space-y-6 mt-0">
                <IncidentChart data={hourlyData} type="MT" />
                <PlanningTable data={hourlyData} type="MT" />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <ConfigPanel config={config} />

            <div className="glass-card p-5 animate-slide-up">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Legenda
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-muted-foreground">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-muted-foreground">Atenção</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Crítico</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 animate-slide-up">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Fórmula
              </h3>
              <div className="font-mono text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                <p>Saldo(h) = Backlog + Entrada_adj</p>
                <p className="mt-1">- Ret_operador - Cap_equipes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
