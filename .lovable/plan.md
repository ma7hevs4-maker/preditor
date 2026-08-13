# Novo sistema de decay (curvas por base)

## O que muda conceitualmente

Hoje o impacto residual do clima após a chuva é calculado por uma **fórmula exponencial de meia-vida** (`exp(-horas / meia-vida)`), com meia-vidas fixas no código e válida apenas para chuva.

A planilha enviada traz algo bem mais preciso: para **cada base (15)**, **cada nível (BT e MT)** e **cada um dos 9 gatilhos** (Chuva Fraca/Moderada/Forte/Muito Forte, Rajada Moderada/Forte/Muito Forte, Calor Extremo, Frio Intenso), uma **curva explícita de 13 horas**: hora 0 (durante o evento) e acréscimos de +1h até +12h.

Verificado: os valores da coluna "Hora 0 (durante)" da planilha são idênticos aos acréscimos já cadastrados nos gatilhos das bases. Ou seja, a planilha estende os gatilhos atuais com a cauda residual — nada precisa ser reconfigurado nos gatilhos.

Passa a valer:
- Decay deixa de ser exponencial e passa a ser **tabelado por base/nível/gatilho**.
- Decay deixa de existir só para chuva: **rajada, calor e frio também** passam a ter cauda residual.
- BT e MT têm curvas independentes (como já ocorre nos acréscimos).
- Continua limitado a 12h após o fim do evento; depois disso o residual é zero.
- Quando um novo evento começa, o residual do anterior é interrompido (o evento ativo prevalece).

## Banco de dados

Nova tabela `weather_decay_curves`:
- vínculo com a base e com o gatilho (tipo + nome, ex. `precip` / "Chuva Forte")
- nível (`BT` ou `MT`)
- período (`NORMAL`, já preparando para outros períodos no futuro)
- 12 colunas de acréscimo residual (`hour_1` … `hour_12`), em %
- leitura liberada, escrita no mesmo padrão das outras tabelas de configuração

Carga inicial: as 270 linhas da planilha (15 bases × 2 níveis × 9 gatilhos).

## Nova aba na tela de Configurações

Aba **"Decay"** ao lado de "Gatilhos", com o mesmo padrão de uso:
- seleção de base
- tabela com uma linha por gatilho × nível e colunas +1h … +12h
- coluna "Hora 0" apenas em leitura (vem do gatilho, para conferência)
- edição célula a célula com colagem estilo Excel (linha/coluna/bloco inteiro), igual ao que já existe nos dados históricos
- botão de salvar por base
- protegida pela senha padrão, como o restante do painel

## Onde o novo decay é aplicado

- Simulação (Micro/Macro): o residual por hora passa a vir da curva da base, por gatilho e por nível.
- Central Climática: mesmos números, já que usa a mesma base de cálculo.
- Detalhe da hora e Resumo Diário: o texto do impacto residual passa a mostrar o gatilho de origem e o acréscimo tabelado, em vez do "% restante" da meia-vida.

## Detalhes técnicos

- `src/hooks/useHalfLife.ts` deixa de ser a fonte do decay: mantém a detecção de episódios (generalizada para qualquer gatilho, não só chuva) e passa a resolver o residual pela curva.
- Novo hook `src/hooks/useWeatherDecayCurves.ts` (query por base + mutations de update), no formato de `useWeatherTriggers.ts`.
- `calculateWeatherUplift` (`src/hooks/useWeatherUplift.ts`) recebe as curvas e o gatilho que originou o último evento, somando gatilhos ativos + residual tabelado.
- `useSimulation.ts` passa a rastrear, por hora, **qual gatilho** estava ativo no fim do último episódio (para escolher a linha correta da curva) em vez de somar mm do episódio.
- `getHalfLifeBucket` sai de `HourDetailDialog.tsx` e `DailySummaryDialog.tsx`, substituído pelo rótulo do gatilho de origem.
- Fallback: base sem curva cadastrada tem residual zero (sem estimativa implícita), e a aba Decay sinaliza a ausência.
- Central de Ajuda: seção de decay atualizada para descrever o modelo tabelado.