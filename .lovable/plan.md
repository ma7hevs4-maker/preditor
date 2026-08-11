# Hoje na Central Climática: híbrido OpenWeatherMap + Open-Meteo

## Contexto

O cálculo dos cards da Central Climática soma as **24 horas do dia selecionado** (00h–23h), e isso permanece assim. Por isso as horas já passadas importam: sem elas os totais de chuva, entrada e equipes necessárias ficariam incompletos.

Hoje o código força o Open-Meteo para o dia atual justamente porque o plano gratuito do OpenWeatherMap só devolve blocos futuros de 3 horas — depois do início do dia, as horas passadas voltam vazias.

## O que muda

Para respeitar a regra "OpenWeatherMap nos 5 primeiros dias, Open-Meteo nos 2 últimos" sem perder as horas passadas:

- **Hoje (dia 0)**: passa a usar **OpenWeatherMap para as horas a partir da hora atual** e **Open-Meteo apenas para as horas já passadas** do dia, montando uma grade completa 00h–23h.
- **Dias 1 a 4**: continuam 100% OpenWeatherMap (como já é hoje).
- **Dias 5 e 6**: continuam 100% Open-Meteo (como já é hoje).
- O selo de API no cabeçalho passa a indicar, no dia de hoje, que a fonte é híbrida.

Os cálculos operacionais (entradas, remoção operador, equipes necessárias, gatilhos, decay) continuam idênticos — muda apenas a origem dos dados horários.

## Detalhes técnicos

- `supabase/functions/weather-forecast/index.ts`: no provedor `openweathermap`, quando o pedido cobrir o dia atual, buscar também o Open-Meteo e usar suas horas para preencher as posições anteriores à hora atual local; devolver `provider: "hybrid"` nesse caso.
- `src/pages/Clima.tsx`: remover a exceção `dayOffset === 0` de `activeProvider` (linha ~1320), deixando a regra `dayOffset > 4 ? "openmeteo" : "openweathermap"`.
- `PROVIDER_LABELS`: adicionar rótulo para o modo híbrido e exibi-lo quando `dayOffset === 0`.
- `src/hooks/useWeather.ts`: sem mudança de assinatura; a chave de cache já inclui provider e `startMode`.
- Fallback preservado: se o OpenWeatherMap falhar ou a chave não existir, tudo volta para Open-Meteo puro.
