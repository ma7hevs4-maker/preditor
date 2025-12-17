-- Criar tabela de bases/regiões
CREATE TABLE public.bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  lat DECIMAL(10, 6) NOT NULL,
  lon DECIMAL(10, 6) NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;

-- Política pública para leitura (dados de bases são públicos)
CREATE POLICY "Bases são visíveis publicamente" 
ON public.bases 
FOR SELECT 
USING (true);

-- Criar tabela de dados históricos por base e hora
CREATE TABLE public.historical_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  -- Dados de BT (Baixa Tensão)
  bt_productivity DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
  bt_entry_rate DECIMAL(10, 2) NOT NULL DEFAULT 10.0,
  bt_operator_removal DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
  -- Dados de MT (Média Tensão)
  mt_productivity DECIMAL(10, 2) NOT NULL DEFAULT 0.8,
  mt_entry_rate DECIMAL(10, 2) NOT NULL DEFAULT 5.0,
  mt_operator_removal DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Garantir que cada base tenha apenas um registro por hora
  UNIQUE(base_id, hour)
);

-- Habilitar RLS
ALTER TABLE public.historical_data ENABLE ROW LEVEL SECURITY;

-- Política pública para leitura
CREATE POLICY "Dados históricos são visíveis publicamente" 
ON public.historical_data 
FOR SELECT 
USING (true);

-- Política pública para inserção/atualização (por enquanto sem auth)
CREATE POLICY "Dados históricos podem ser inseridos" 
ON public.historical_data 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Dados históricos podem ser atualizados" 
ON public.historical_data 
FOR UPDATE 
USING (true);

-- Criar tabela para configurações de simulação (equipes por hora)
CREATE TABLE public.simulation_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  -- Equipes por hora (0-23)
  teams_hour_0 INTEGER NOT NULL DEFAULT 0,
  teams_hour_1 INTEGER NOT NULL DEFAULT 0,
  teams_hour_2 INTEGER NOT NULL DEFAULT 0,
  teams_hour_3 INTEGER NOT NULL DEFAULT 0,
  teams_hour_4 INTEGER NOT NULL DEFAULT 0,
  teams_hour_5 INTEGER NOT NULL DEFAULT 0,
  teams_hour_6 INTEGER NOT NULL DEFAULT 0,
  teams_hour_7 INTEGER NOT NULL DEFAULT 0,
  teams_hour_8 INTEGER NOT NULL DEFAULT 0,
  teams_hour_9 INTEGER NOT NULL DEFAULT 0,
  teams_hour_10 INTEGER NOT NULL DEFAULT 0,
  teams_hour_11 INTEGER NOT NULL DEFAULT 0,
  teams_hour_12 INTEGER NOT NULL DEFAULT 0,
  teams_hour_13 INTEGER NOT NULL DEFAULT 0,
  teams_hour_14 INTEGER NOT NULL DEFAULT 0,
  teams_hour_15 INTEGER NOT NULL DEFAULT 0,
  teams_hour_16 INTEGER NOT NULL DEFAULT 0,
  teams_hour_17 INTEGER NOT NULL DEFAULT 0,
  teams_hour_18 INTEGER NOT NULL DEFAULT 0,
  teams_hour_19 INTEGER NOT NULL DEFAULT 0,
  teams_hour_20 INTEGER NOT NULL DEFAULT 0,
  teams_hour_21 INTEGER NOT NULL DEFAULT 0,
  teams_hour_22 INTEGER NOT NULL DEFAULT 0,
  teams_hour_23 INTEGER NOT NULL DEFAULT 0,
  -- Horizonte de simulação (em horas, máx 72)
  horizon_hours INTEGER NOT NULL DEFAULT 24 CHECK (horizon_hours >= 1 AND horizon_hours <= 72),
  -- Backlog inicial
  bt_initial_backlog INTEGER NOT NULL DEFAULT 0,
  mt_initial_backlog INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.simulation_configs ENABLE ROW LEVEL SECURITY;

-- Políticas públicas
CREATE POLICY "Configs são visíveis publicamente" 
ON public.simulation_configs 
FOR SELECT 
USING (true);

CREATE POLICY "Configs podem ser inseridas" 
ON public.simulation_configs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Configs podem ser atualizadas" 
ON public.simulation_configs 
FOR UPDATE 
USING (true);

CREATE POLICY "Configs podem ser deletadas" 
ON public.simulation_configs 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bases_updated_at
BEFORE UPDATE ON public.bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_historical_data_updated_at
BEFORE UPDATE ON public.historical_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_simulation_configs_updated_at
BEFORE UPDATE ON public.simulation_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir as 15 bases
INSERT INTO public.bases (name, lat, lon) VALUES
  ('Angra dos Reis', -23.0067, -44.3181),
  ('Araruama', -22.8728, -42.3431),
  ('Cabo Frio', -22.8789, -42.0186),
  ('Campos', -21.7545, -41.3244),
  ('Cantagalo', -21.9811, -42.3681),
  ('Itaperuna', -21.2050, -41.8879),
  ('Macaé', -22.3768, -41.7869),
  ('Magé', -22.6528, -43.0408),
  ('Maricá', -22.9194, -42.8186),
  ('Niterói', -22.8833, -43.1036),
  ('Pádua', -21.4650, -41.9669),
  ('Petrópolis', -22.5050, -43.1786),
  ('Resende', -22.4686, -44.4467),
  ('São Gonçalo', -22.8268, -43.0534),
  ('Teresópolis', -22.4119, -42.9658);

-- Inserir dados históricos padrão para cada base (24 horas)
INSERT INTO public.historical_data (base_id, hour, bt_productivity, bt_entry_rate, bt_operator_removal, mt_productivity, mt_entry_rate, mt_operator_removal)
SELECT 
  b.id,
  h.hour,
  -- Produtividade BT varia por hora (menor à noite)
  CASE 
    WHEN h.hour BETWEEN 0 AND 5 THEN 0.6
    WHEN h.hour BETWEEN 6 AND 11 THEN 1.2
    WHEN h.hour BETWEEN 12 AND 17 THEN 1.0
    ELSE 0.8
  END,
  -- Entrada BT varia por hora
  CASE 
    WHEN h.hour BETWEEN 0 AND 5 THEN 3.0
    WHEN h.hour BETWEEN 6 AND 11 THEN 12.0
    WHEN h.hour BETWEEN 12 AND 17 THEN 15.0
    ELSE 8.0
  END,
  -- Retirada de operador BT
  CASE 
    WHEN h.hour BETWEEN 0 AND 5 THEN 0.5
    WHEN h.hour BETWEEN 6 AND 11 THEN 2.0
    WHEN h.hour BETWEEN 12 AND 17 THEN 2.5
    ELSE 1.5
  END,
  -- Produtividade MT
  CASE 
    WHEN h.hour BETWEEN 0 AND 5 THEN 0.4
    WHEN h.hour BETWEEN 6 AND 11 THEN 0.9
    WHEN h.hour BETWEEN 12 AND 17 THEN 0.8
    ELSE 0.6
  END,
  -- Entrada MT
  CASE 
    WHEN h.hour BETWEEN 0 AND 5 THEN 1.0
    WHEN h.hour BETWEEN 6 AND 11 THEN 4.0
    WHEN h.hour BETWEEN 12 AND 17 THEN 5.0
    ELSE 3.0
  END,
  -- Retirada de operador MT
  CASE 
    WHEN h.hour BETWEEN 0 AND 5 THEN 0.2
    WHEN h.hour BETWEEN 6 AND 11 THEN 0.8
    WHEN h.hour BETWEEN 12 AND 17 THEN 1.0
    ELSE 0.5
  END
FROM public.bases b
CROSS JOIN generate_series(0, 23) AS h(hour);