---
name: Liberação de edição de estrutura
description: Aba "Liberar" nas configurações libera edição de estrutura planejada/realizada por base e período, consumida ao salvar
type: feature
---
- Tabela `plan_edit_unlocks` (base_id, plan_kind, start_date, end_date, consumed_dates, active).
- Aba "Liberar" no painel admin (senha 'dys') cria/revoga liberações por polo/sucursal + período + tipo (planejada/realizada).
- Na aba Estrutura, se existe liberação ativa cobrindo base+dia, a edição fica desbloqueada sem senha (badge verde "Edição liberada até dd/MM").
- Ao salvar, o(s) dia(s) entram em `consumed_dates`; quando todo o período é consumido a liberação é desativada e o bloqueio por senha volta.
