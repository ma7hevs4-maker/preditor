# Modelo de Dados - Aba Operacional

## Junção das bases
- **Chave**: coluna "Equipe Desl." (incidentes.xlsx) ↔ coluna "Equipe" (m300.xlsx)
- **Nr Incidente**: "Número" (incidentes, com zeros à esquerda ex: 0028293568) ↔ "Nr_Ordem" (m300, sem zeros ex: 28293568)
- **Datas**: "Data Início" (incidentes) ↔ "Inicio Calendario" (m300)

## Colunas exclusivas do M300
| Métrica | Coluna M300 |
|---|---|
| Login | "Log In Corrigido" |
| Logoff | "Log Off Corrigido" |
| Tempo de Plataforma | Calculado: minutos entre Login e despacho do 1º incidente |
| Retorno à Base | Calculado: minutos entre "Liberada" do último incidente e Logoff |
| Início do Turno | "Inicio Calendario" |
| Fim do Turno | "Fim Calendario" |
| Intervalo | período entre "Inicio intervalo" e "Fim intervalo" |

## Colunas exclusivas de Incidentes
| Métrica | Coluna Incidentes |
|---|---|
| Nº Cliente | "Nº Cliente" |
| Polo | "Polo" |

## Colunas com equivalência nas duas bases
| Métrica | Incidentes | M300 |
|---|---|---|
| TMD | "TMD" (ou "No_Local" - "A_Caminho") | usado apenas se incidente não encontrado na base incidentes |
| TME | "TME" (ou "Liberada" - "No_Local") | usado apenas se incidente não encontrado na base incidentes |
| Causa | "Causa" | "CAUSA" |

## Definições de negócio

### Reincidente
Incidente com o mesmo número de cliente após outro incidente anterior.

### Improdutivo
Incidentes com as seguintes causas:
- CASA FECHADA
- DEFEITO INTERNO CLIENTE
- ENDEREÇO NÃO LOCALIZADO
- ESTAVA NORMAL
- GRANDE CLIENTE DEFEITO INTERNO
- INCIDENCIA SEM AFETAÇÃO
- LUZ CORTADA
- NIVEL DE TENSÃO NORMAL
- OSCILAÇÃO
- OSCILAÇÃO PROVOCADA POR TERCEIROS
- OUTRAS CAUSAS DE TERCEIROS
- REGISTRO INDEVIDO DA RECLAMAÇÃO
- UC FECHADA

### Ordem 2
- Coluna "ord 2" com valor "sim"
- OU coluna "observação" contendo termos: "ord2", "ord 2", "Ordem2", "Ordem 2", "Ord2", "Ord 2", "ordem2", "ordem 2", "ordens 2" (e variações)

## Fluxo operacional de uma equipe no dia
1. **IT** (Inicio Calendário) - início do turno
2. **Login** (Log In Corrigido) - momento que a equipe loga
3. **Tempo de Plataforma** (1º Desloc) - tempo entre login e início de deslocamento do 1º incidente
4. **Incidentes** - sequência de atendimentos (TMD + TME cada)
5. **Intervalo** - período entre "Inicio intervalo" e "Fim intervalo"
6. **Logoff** (Log Off Corrigido) - momento que a equipe desloga
7. **FT** (Fim Calendario) - fim do turno
