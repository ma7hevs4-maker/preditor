

# Otimização do Sistema de Salvamento/Carregamento Mensal

## Problema Atual

Com ~7.7k linhas de incidentes (27 MB) e ~3.8k M300 (8 MB) para um único snapshot, o sistema já ocupa 35 MB. Para acumulação mensal (estimativa de 30-50k linhas únicas), o problema é duplo:

1. **Salvamento lento**: Apaga tudo e reinsere tudo a cada vez (22+ chamadas API)
2. **Carregamento lento**: Busca todas as linhas em páginas de 1000, depois processa tudo no client-side

## Solução Proposta (3 frentes)

### 1. Upsert com chave única (elimina delete+reinsert)

- Adicionar coluna `row_hash` (TEXT) às tabelas `saved_inc_rows` e `saved_m300_rows` com constraint UNIQUE
- O hash será gerado a partir de campos-chave do incidente (Número + Equipe + Data)
- No salvamento, usar **upsert** (`ON CONFLICT DO UPDATE`) em vez de deletar tudo e reinserir
- Resultado: ~90% das linhas que já existem são ignoradas, só insere/atualiza o que mudou

### 2. Cache de dados processados

- Criar tabela `saved_processed_cache` com uma coluna JSONB comprimida contendo o resultado do `processRawData`
- Após cada salvamento, armazenar o resultado processado
- No carregamento, buscar direto o cache processado (1 única query) em vez de buscar todas as linhas raw e reprocessar
- Invalidar o cache quando novos dados são salvos

### 3. Limpeza de dados raw antes de salvar

- Remover colunas desnecessárias do JSONB antes de persistir (reduz ~40-60% do tamanho)
- Manter apenas as colunas que `processRawData` realmente utiliza

## Mudanças Técnicas

### Migração SQL
- Adicionar coluna `row_hash TEXT` + índice UNIQUE em `saved_inc_rows` e `saved_m300_rows`
- Criar tabela `saved_processed_cache` (id, meta_id, processed_data JSONB, created_at)
- Habilitar UPDATE nas políticas RLS de `saved_inc_rows` e `saved_m300_rows` (necessário para upsert)

### `useSavedDashboard.ts`
- Gerar hash por linha antes do insert
- Substituir `deleteAll + batchInsert` por `batchUpsert` 
- Após salvar, armazenar cache processado
- No `loadSavedData`, tentar carregar do cache primeiro; se não existir, fazer o fetch raw + processamento

### `Meu.tsx`
- Adicionar botão "Limpar base mensal" para resetar quando o usuário quiser começar novo mês
- Mostrar progresso mais detalhado (X de Y linhas novas)

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Salvamento (90% repetido) | ~22 API calls | ~3-4 API calls |
| Carregamento | ~12 API calls + processamento | 1 API call (cache) |
| Espaço mensal (~30k linhas) | ~120 MB | ~50-70 MB (colunas limpas) |

