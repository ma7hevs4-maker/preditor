import { useState } from "react";
import { HelpCircle, Zap, CloudSun, Users, Eye, ChevronRight, Calculator, BarChart3, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";

type Section = "simulacao" | "clima" | "estrutura" | "visao" | "meu" | "config";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "simulacao", label: "Simulação", icon: Zap },
  { id: "clima", label: "Central Climática", icon: CloudSun },
  { id: "estrutura", label: "Estrutura", icon: Users },
  { id: "visao", label: "Visão", icon: Eye },
  { id: "meu", label: "Dashboard Operacional", icon: BarChart3 },
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
          <p>Corte e Religa, Perdas — contribuem apenas para a resolução de incidentes BT.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Excluídas dos cálculos:</p>
          <p>LV Manutenção, LV Obras, MK Manutenção, MK Obras, Reguladas — exibidas para planejamento, mas não impactam a capacidade de resolução.</p>
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

const RANKING_WEIGHT_DEFS: { key: string; label: string; higher: boolean }[] = [
  { key: "ranking_weight_incidentes", label: "Incidentes", higher: true },
  { key: "ranking_weight_dias", label: "Dias Trabalhados", higher: true },
  { key: "ranking_weight_improdutivos", label: "Improdutivos", higher: false },
  { key: "ranking_weight_reincidentes", label: "Reincidentes", higher: false },
  { key: "ranking_weight_ociosidade", label: "Ociosidade", higher: false },
  { key: "ranking_weight_inc_ociosidade", label: "Inc. Ociosid.", higher: false },
  { key: "ranking_weight_login", label: "Login", higher: false },
  { key: "ranking_weight_despacho", label: "Despacho", higher: false },
  { key: "ranking_weight_plataforma", label: "T. Plataforma", higher: false },
  { key: "ranking_weight_retorno", label: "Retorno Base", higher: false },
];

const RankingWeightsTable = () => {
  const { data: settings } = useSystemSettings();
  const rows = RANKING_WEIGHT_DEFS.map((d) => {
    const s = settings?.find((x) => x.key === d.key);
    const value = s ? Number(s.value) : 0;
    return { ...d, value: isNaN(value) ? 0 : value };
  }).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-2 py-1 font-medium">Métrica</th>
            <th className="text-right px-2 py-1 font-medium">Peso</th>
            <th className="text-left px-2 py-1 font-medium">Direção</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border">
              <td className="px-2 py-1">{r.label}</td>
              <td className="px-2 py-1 text-right font-mono">{r.value}</td>
              <td className="px-2 py-1">{r.higher ? "Maior é melhor" : "Menor é melhor"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MeuHelp = () => (
  <div className="space-y-6 text-sm text-foreground/90">
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Visão Geral
      </h3>
      <p>
        O <strong>Dashboard Operacional</strong> (/meu) analisa bases de incidentes e M300 carregadas via upload de planilhas Excel. Exibe KPIs, resultado por processo, ranking das equipes e timeline visual dos incidentes.
      </p>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" /> Passo a Passo
      </h3>
      <ol className="list-decimal list-inside space-y-2 pl-1">
        <li><strong>Faça upload</strong> da base de incidentes (.xlsx) e opcionalmente da base M300.</li>
        <li><strong>Clique em "Gerar Dashboard"</strong> para processar e visualizar.</li>
        <li><strong>Use os filtros</strong> (lateral direita) para refinar por polo, processo, turno, equipe, data ou período.</li>
        <li><strong>Selecione equipes</strong> no Ranking para ver a timeline e detalhes dos incidentes.</li>
        <li><strong>Salve os dados</strong> para acumular a base mensal no Supabase (senha requerida).</li>
      </ol>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Modo de Análise (Período)</h3>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>No painel de filtros, ative o <strong>Modo de Análise</strong> para selecionar um período (data início e fim).</p>
        <p>No modo período, as colunas de <strong>Incidentes, Improdutivos, Ordem 2 e Reincidentes</strong> exibem o <strong>total acumulado</strong> do período.</p>
        <p>As colunas de <strong>TMDE, Ocupação, Ociosidade, Login, Despacho, T. Plataforma e Retorno à Base</strong> exibem a <strong>média</strong> do período.</p>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Classificação de Incidentes</h3>
      <div className="space-y-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Reincidente:</p>
          <p>Incidentes que <strong>geraram reincidência</strong>, identificados pela coluna <code>Reincidente tipo</code> com um dos valores: <em>1ª Incidência Individual</em>, <em>1ª Incidência Coletiva</em>, <em>MT RAMAL 1ª Incidência</em> ou <em>MT TRONCO 1ª Incidência</em>. Na linha do tempo aparecem com uma linha vermelha no centro do bloco.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Improdutivo:</p>
          <p>Incidentes com causas específicas como CASA FECHADA, UC FECHADA, ENDEREÇO NÃO LOCALIZADO, ESTAVA NORMAL, entre outras causas de terceiros ou sem afetação.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Ordem 2:</p>
          <p>Identificado pela coluna 'ord 2' (valor 'sim') ou via termos como 'ord2', 'ordem 2' em observações.</p>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" /> Fórmulas e Métricas
      </h3>
      <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border/50">
        <div>
          <p className="font-medium text-foreground">Tempo de Plataforma (min):</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            T. Plat. = min(Início Turno → 1º Despacho, 25 min)
          </code>
          <p className="text-xs text-muted-foreground mt-1">Se o intervalo ocorre antes do 1º despacho, usa-se o início do intervalo. Limitado ao ideal de 25 min.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Volta à Base (min):</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Ret. Base = min(Último incidente liberado → Logoff, 40 min)
          </code>
          <p className="text-xs text-muted-foreground mt-1">Se o intervalo é o último evento antes do logoff, usa-se o início do intervalo. Limitado ao ideal de 40 min.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Intervalo:</p>
          <p className="text-xs text-muted-foreground">Período de descanso entre incidentes, limitado ao ideal de 60 min.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Ocupação (%):</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Ocupação = (Σ(TMD + TME) + T.Plat.capado + Interv.capado + Ret.capado) / Duração Turno × 100
          </code>
          <p className="text-xs text-muted-foreground mt-1">Equipes com ocupação {'>'} 120% são excluídas das médias por processo para evitar distorções.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Ociosidade (min):</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Ociosidade = Duração Turno - Σ(TMD + TME) - T.Plat.capado - Interv.capado - Ret.capado
          </code>
          <p className="text-xs text-muted-foreground mt-1">Tempo absoluto de inatividade. Excesso nos tempos ideais é contabilizado como ociosidade.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Inc. Ociosidade:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Inc. Ociosid. = round(minutos ociosos / 60)
          </code>
          <p className="text-xs text-muted-foreground mt-1">Quantidade de incidentes potenciais perdidos no tempo ocioso.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Produtividade:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
            Produtividade = Incidentes Produtivos / Equipes Únicas
          </code>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Persistência e Acumulação</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• <strong>Salvar:</strong> Envia os dados brutos ao Supabase com upsert (não duplica registros com mesmo ID+Equipe+Data).</li>
        <li>• <strong>Acessar última atualização:</strong> Carrega os dados processados do cache, sem reprocessamento.</li>
        <li>• <strong>Limpar base mensal:</strong> Remove todos os dados salvos (protegido por senha).</li>
        <li>• <strong>Login e Despacho:</strong> Mantêm valores brutos (em minutos) para referência de auditoria.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">Timeline</h3>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>• <strong>Barras azuis:</strong> TMD (tempo de deslocamento).</li>
        <li>• <strong>Barras verdes:</strong> TME (tempo de execução) dentro do padrão.</li>
        <li>• <strong>Barras vermelhas:</strong> TME acima do tempo padrão do processo.</li>
        <li>• <strong>Faixa laranja:</strong> Intervalo programado.</li>
        <li>• <strong>Faixa verde clara:</strong> Tempo de plataforma (login → 1º despacho).</li>
        <li>• <strong>Faixa vermelha clara:</strong> Retorno à base (último incidente → logoff).</li>
        <li>• <strong>Linha tracejada verde:</strong> Limite ideal de retorno (40 min).</li>
        <li>• <strong>Incidentes M300:</strong> Exibidos com borda tracejada (presentes apenas no M300, ausentes da base principal).</li>
      </ul>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Análise de Polos
      </h3>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>Acesse pelo botão <strong>"Análise Polos"</strong> no topo do dashboard. Os filtros ativos (data, polo, processo, turno, equipe) continuam valendo.</p>
        <p>Use o alternador <strong>UTS / UTN</strong> para visualizar os polos de cada Unidade Técnica. Cada polo exibe:</p>
        <ul className="list-disc list-inside pl-2 space-y-1">
          <li><strong>KPIs:</strong> Total de incidentes, TMDE médio e taxa de reincidência.</li>
          <li><strong>Resultado por Processo:</strong> Incidentes, equipes, improdutivos, reincidentes e produtividade por processo.</li>
          <li><strong>Ranking:</strong> Equipes classificadas por pontuação composta (0–100).</li>
        </ul>
        <p>Clique em uma equipe no ranking para abrir o <strong>modal de detalhes</strong> com todos os indicadores e a timeline individual.</p>
      </div>
    </div>

    <div>
      <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Sistema de Ranking (Pontuação)
      </h3>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>A pontuação de cada equipe é calculada com base em métricas normalizadas com pesos configuráveis:</p>
        <ul className="list-disc list-inside pl-2 space-y-1">
          <li><strong>↑ Maior é melhor:</strong> Incidentes, Dias Trabalhados.</li>
          <li><strong>↓ Menor é melhor:</strong> Improdutivos, Reincidentes, Ociosidade, Inc. Ociosid., Login, Despacho, T. Plataforma, Retorno Base.</li>
        </ul>
        <p><strong>Como funciona:</strong></p>
        <p className="!mt-2"><strong>O que é "métrica normalizada"?</strong></p>
        <p>É o valor da métrica convertido para uma escala de <strong>0 a 1</strong>, em que 0 corresponde à pior equipe daquela métrica (entre as filtradas) e 1 à melhor. Isso permite somar métricas de unidades diferentes (ex.: minutos de ociosidade com quantidade de incidentes) numa mesma pontuação. A normalização é <em>relativa</em>: depende do conjunto de equipes exibido no momento.</p>
        <p><strong>Passo a passo:</strong></p>
        <ol className="list-decimal list-inside pl-2 space-y-1">
          <li>Para cada métrica, normaliza-se o valor entre 0 e 1: <code className="bg-muted px-1 rounded">(valor - mín) / (máx - mín)</code>, considerando o mín/máx entre todas as equipes filtradas.</li>
          <li>Métricas "↓ melhor" são invertidas: <code className="bg-muted px-1 rounded">1 - normalizado</code>.</li>
          <li>Multiplica-se cada valor normalizado pelo peso configurado e divide-se pela soma dos pesos ativos para a equipe (métricas sem dado são ignoradas).</li>
          <li>Multiplica-se por 100 para obter a pontuação final (0–100).</li>
        </ol>
        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
          Pontuação = Σ(métrica_normalizada × peso) / Σ(pesos_ativos) × 100
        </code>
        <p className="!mt-2"><strong>Pesos atuais em produção:</strong></p>
        <RankingWeightsTable />
        <p>Equipes sem dados em Login, Despacho, T. Plataforma ou Retorno Base são sinalizadas com <strong>asterisco (*)</strong> — essas métricas são ignoradas no cálculo, mas as demais ainda contam.</p>
        <p>Os pesos podem ser ajustados em <strong>Configurações → aba Ranking</strong> (senha requerida). Peso 0 desativa a métrica.</p>
      </div>
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
    meu: <MeuHelp />,
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
