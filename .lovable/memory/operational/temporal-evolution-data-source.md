---
name: Operational temporal evolution data source
description: Fonte de dados para análise de evolução temporal dos polos no /meu — somente base atual, sem snapshots
type: constraint
---
A análise de "Evolução Temporal" no Dashboard Operacional (/meu) usa SOMENTE a base atual carregada (quebrando por semana/mês via coluna de data dos incidentes). NÃO implementar snapshots automáticos no upload — tentativas anteriores duplicaram números do mesmo dia em bases diferentes. **Why:** Upload mensal substitui dados; snapshots geraram inconsistência. Reavaliar futuramente quando houver controle robusto de dedupe.
