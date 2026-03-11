import { useState } from "react";
import { HelpCircle, Zap, CloudSun, Users, Eye, ChevronRight, Calculator, BarChart3, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Section = "simulacao" | "clima" | "estrutura" | "visao" | "config";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "simulacao", label: "Simulação", icon: Zap },
  { id: "clima", label: "Central Climática", icon: CloudSun },
  { id: "estrutura", label: "Estrutura", icon: Users },
  { id: "visao", label: "Visão", icon: Eye },
  { id: "config", label: "Configurações", icon: Settings },
];

const SimulacaoHelp = () => (
  <div className="space-y-6 text-sm text-foreground/90">
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" /> Visão Geral
      </h3>
      <p>
        A página de <strong>Simulação</strong> é o coração do Preditor. Ela projeta o saldo de incidentes (backlog) de BT e MT ao longo do horizonte definido, considerando dados históricos, equipes disponíveis e impacto climático.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" /> Passo a Passo
      </h3>
      <ol className="list-decimal list-inside space-y-2 pl-1">
        <li><strong>Selecione a base (regional)</strong> no cabeçalho. Os dados históricos e meteorológicos serão carregados automaticamente.</li>
        <li><strong>Defina o backlog inicial</strong> de BT e MT nos campos de configuração.</li>
        <li><strong>Configure o horizonte</strong> de simulação (em horas ou dias).</li>
        <li><strong>Verifique as equipes</strong> — são carregadas do plano diário da página Estrutura. Você pode editá-las diretamente na tabela.</li>
        <li><strong>Analise os resultados</strong> — a tabela e o gráfico mostram a projeção hora a hora do saldo de incidentes.</li>
        <li><strong>Salve a simulação</strong> no histórico para referência futura.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" /> Lógica e Cálculos
      </h3>
      <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border/50">
        <div>
          <p className="font-medium text-foreground">Fórmula do Backlog:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Saldo = max(0, Backlog Anterior + Entrada Ajustada - Retirada Operador - Capacidade Equipe)
          </code>
        </div>
        <div>
          <p className="font-medium text-foreground">Entrada Ajustada:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Entrada Ajustada = Taxa Histórica × (1 + Uplift Climático)
          </code>
          <p className="text-xs text-muted-foreground mt-1">O uplift climático é calculado com base nos gatilhos ativos (chuva, vento, rajada, temperatura).</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Capacidade por Hora:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Cap BT/h = (Produtividade / 8) × (Equipes BT + Equipes Perdas)
          </code>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Cap MT/h = (Produtividade / 8) × Equipes MT
          </code>
        </div>
        <div>
          <p className="font-medium text-foreground">Alocação de Equipes:</p>
          <p className="text-xs text-muted-foreground">MT tem prioridade. As equipes são alocadas primeiro para MT (conforme demanda) e o restante vai para BT. Equipes de "Perdas" (BT Only) contribuem exclusivamente para BT.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Retirada Remota:</p>
          <p className="text-xs text-muted-foreground">Nas primeiras 8 horas, uma porcentagem (configurável) do backlog de BT é retirada automaticamente pelo atendimento remoto.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Equipes Adicionais:</p>
          <p className="text-xs text-muted-foreground">Indica quantas equipes extras por hora seriam necessárias para atingir a meta ao final do horizonte, distribuindo o gap proporcionalmente.</p>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Funções do Cabeçalho</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• <strong>Simular Clima:</strong> Override manual de chuva, vento e temperatura por período.</li>
        <li>• <strong>Simular Operacional:</strong> Ajustes percentuais em produtividade, entrada e retirada por turno/hora.</li>
        <li>• <strong>Provedor de Clima:</strong> Alterne entre Open-Meteo e OpenWeatherMap.</li>
        <li>• <strong>Impacto Clima:</strong> Ative/desative o efeito do clima na simulação.</li>
        <li>• <strong>Resumo Diário:</strong> Detalhamento com gatilhos, entradas e capacidade por dia.</li>
        <li>• <strong>Histórico:</strong> Salve e carregue simulações anteriores.</li>
      </ul>
    </div>
  </div>
);

const ClimaHelp = () => (
  <div className="space-y-6 text-sm text-foreground/90">
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <CloudSun className="w-4 h-4 text-primary" /> Visão Geral
      </h3>
      <p>
        A <strong>Central Climática</strong> exibe a previsão meteorológica para todas as bases (regionais), agrupadas por UT (UTS/UTN). Permite monitorar condições que afetam a operação.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Como Usar</h3>
      <ol className="list-decimal list-inside space-y-2 pl-1">
        <li><strong>Selecione a UT</strong> (UTS ou UTN) nas abas superiores.</li>
        <li><strong>Navegue entre dias</strong> com as setas ou selecione a data.</li>
        <li><strong>Clique em um card</strong> de regional para ver o detalhamento hora a hora.</li>
        <li><strong>Analise os gatilhos</strong> — alertas de chuva, vento e rajada são destacados quando ultrapassam os limites configurados.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Informações Exibidas</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• <strong>Precipitação:</strong> Classificada em Seco, Fraca, Moderada, Forte e Muito Forte.</li>
        <li>• <strong>Vento:</strong> Velocidade média classificada de Leve a Muito Forte.</li>
        <li>• <strong>Rajadas:</strong> Picos de velocidade que ativam gatilhos específicos.</li>
        <li>• <strong>Temperatura:</strong> Monitorada para gatilhos de frio.</li>
        <li>• <strong>Gatilhos Ativos:</strong> Listados abaixo de cada card quando as condições excedem os limites.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Provedor de Dados</h3>
      <p className="text-xs text-muted-foreground">
        O sistema suporta dois provedores: <strong>Open-Meteo</strong> (padrão, gratuito) e <strong>OpenWeatherMap</strong>. A alternância é feita na página de Simulação.
      </p>
    </div>
  </div>
);

const EstruturaHelp = () => (
  <div className="space-y-6 text-sm text-foreground/90">
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" /> Visão Geral
      </h3>
      <p>
        A página de <strong>Estrutura</strong> gerencia o planejamento diário de equipes por base. Aqui você define quantas equipes de cada tipo estarão disponíveis em cada hora do dia.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Passo a Passo</h3>
      <ol className="list-decimal list-inside space-y-2 pl-1">
        <li><strong>Selecione a base</strong> para a qual deseja planejar.</li>
        <li><strong>Escolha a data</strong> (ou um período) para o planejamento.</li>
        <li><strong>Desbloqueie a edição</strong> com a senha de administrador.</li>
        <li><strong>Preencha a tabela</strong> com a quantidade de equipes por tipo e hora.</li>
        <li><strong>Salve o plano</strong> — ele será automaticamente usado pela Simulação.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Tipos de Equipe</h3>
      <div className="space-y-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Gerais (contribuem para todos os incidentes):</p>
          <p>Emergência, Gestores, Poda, Cesto Manutenção, Cesto Obras — priorizam MT e o restante vai para BT.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Apoio (contribuem para todos os incidentes):</p>
          <p>Apoio UTS, Apoio UTN — funcionam como as equipes gerais.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">BT Only (exclusivas para BT):</p>
          <p>Corte e Religa, Perdas, Reguladas — contribuem apenas para a resolução de incidentes BT.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Excluídas do cálculo:</p>
          <p>LV Manutenção, LV Obras, MK Manutenção, MK Obras — não participam do cálculo de capacidade.</p>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Estruturas Salvas</h3>
      <p className="text-xs text-muted-foreground">
        Você pode salvar configurações de equipes como "estruturas" reutilizáveis para aplicar rapidamente em diferentes datas. Use o botão de bookmark para salvar e o seletor de estruturas para carregar.
      </p>
    </div>
  </div>
);

const VisaoHelp = () => (
  <div className="space-y-6 text-sm text-foreground/90">
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Eye className="w-4 h-4 text-primary" /> Visão Geral
      </h3>
      <p>
        A página de <strong>Visão</strong> oferece um panorama consolidado de todas as regionais (polos) de uma UT, exibindo a distribuição de equipes por tipo e turno em um único dashboard.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Como Usar</h3>
      <ol className="list-decimal list-inside space-y-2 pl-1">
        <li><strong>Selecione a UT</strong> (UTS ou UTN) nas abas superiores.</li>
        <li><strong>Navegue entre dias</strong> para ver o planejamento de diferentes datas.</li>
        <li><strong>Alterne entre modos:</strong>
          <ul className="list-disc list-inside ml-4 mt-1">
            <li><strong>Polos:</strong> Exibe cards individuais por polo/regional.</li>
            <li><strong>Consolidado:</strong> Agrega todos os dados em uma única tabela.</li>
          </ul>
        </li>
        <li><strong>Clique em um card</strong> de polo para ver o detalhamento hora a hora.</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Indicadores</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• <strong>Totais por Turno:</strong> Soma de equipes por turno (A: 0-7h, B: 8-15h, C: 16-23h).</li>
        <li>• <strong>Eq/h Total:</strong> Média de equipes disponíveis por hora no dia (excluindo LV/MK).</li>
        <li>• <strong>Eq/h MT:</strong> Média de equipes que contribuem para MT (Gerais + Apoio).</li>
        <li>• <strong>Eq/h BT:</strong> Soma de Eq/h MT + média de equipes BT Only.</li>
      </ul>
    </div>
  </div>
);

const ConfigHelp = () => (
  <div className="space-y-6 text-sm text-foreground/90">
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" /> Configurações
      </h3>
      <p>
        O painel de configurações (acessado pela sidebar, protegido por senha) permite ajustar parâmetros globais do sistema.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Parâmetros Configuráveis</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• <strong>Dados Históricos:</strong> Taxas de entrada, produtividade e retirada de operador por hora e por base.</li>
        <li>• <strong>Metas (Targets):</strong> Backlog alvo de BT e MT para cálculo de equipes adicionais.</li>
        <li>• <strong>Retirada Remota (%):</strong> Percentual do backlog BT removido automaticamente nas primeiras 8 horas.</li>
        <li>• <strong>Gatilhos Climáticos:</strong> Configuração de limites e impactos por tipo de condição meteorológica.</li>
        <li>• <strong>Níveis de Contingência:</strong> Faixas de backlog para classificação (Normal, Nível 1, Nível 2, Crise, Extremo).</li>
        <li>• <strong>Bases:</strong> Cadastro e coordenadas das bases para previsão meteorológica.</li>
      </ul>
    </div>
  </div>
);

interface HelpDialogProps {
  trigger: React.ReactNode;
}

export function HelpDialog({ trigger }: HelpDialogProps) {
  const [activeSection, setActiveSection] = useState<Section>("simulacao");

  const contentMap: Record<Section, React.ReactNode> = {
    simulacao: <SimulacaoHelp />,
    clima: <ClimaHelp />,
    estrutura: <EstruturaHelp />,
    visao: <VisaoHelp />,
    config: <ConfigHelp />,
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] p-0 gap-0 bg-card border-border">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <HelpCircle className="w-5 h-5 text-primary" />
            Central de Ajuda
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar nav */}
          <div className="w-48 border-r border-border bg-muted/20 p-2 shrink-0">
            <nav className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                    activeSection === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <s.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {contentMap[activeSection]}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
