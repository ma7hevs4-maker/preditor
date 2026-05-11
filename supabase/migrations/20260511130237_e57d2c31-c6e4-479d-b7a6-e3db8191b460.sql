-- Garantir chave única para permitir upsert em system_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'system_settings_key_unique'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- Inserir peso de Dias Trabalhados se ainda não existir
INSERT INTO public.system_settings (key, value, description)
VALUES ('ranking_weight_dias', '0', 'Peso da métrica Dias Trabalhados no ranking')
ON CONFLICT (key) DO NOTHING;