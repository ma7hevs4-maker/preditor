-- Tabela de configurações gerais do sistema
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Configurações são visíveis publicamente" 
ON public.system_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Configurações podem ser atualizadas" 
ON public.system_settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Configurações podem ser inseridas" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir valores padrão
INSERT INTO public.system_settings (key, value, description) VALUES
('operator_removal_percent', '40', 'Porcentagem de retirada de operador do backlog inicial'),
('bt_target', '70', 'Meta de backlog estável para BT'),
('mt_target', '10', 'Meta de backlog estável para MT');

-- Tabela de gatilhos climáticos
CREATE TABLE public.weather_triggers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id uuid REFERENCES public.bases(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL, -- 'precip', 'wind', 'temp'
  condition_min numeric,
  condition_max numeric,
  impact_percent numeric NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weather_triggers ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Gatilhos são visíveis publicamente" 
ON public.weather_triggers 
FOR SELECT 
USING (true);

CREATE POLICY "Gatilhos podem ser inseridos" 
ON public.weather_triggers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Gatilhos podem ser atualizados" 
ON public.weather_triggers 
FOR UPDATE 
USING (true);

CREATE POLICY "Gatilhos podem ser deletados" 
ON public.weather_triggers 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_weather_triggers_updated_at
BEFORE UPDATE ON public.weather_triggers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir gatilhos padrão (base_id NULL = padrão para todas as bases)
INSERT INTO public.weather_triggers (base_id, name, trigger_type, condition_min, condition_max, impact_percent, description) VALUES
(NULL, 'Chuva Fraca', 'precip', 0.2, 1, 15, 'Aumento de 15% nas ocorrências de curto-circuito'),
(NULL, 'Chuva Moderada', 'precip', 1, 5, 35, 'Aumento de 35% nas ocorrências de curto-circuito'),
(NULL, 'Chuva Forte', 'precip', 5, NULL, 60, 'Aumento de 60% nas ocorrências de curto-circuito'),
(NULL, 'Vento Moderado', 'wind', 4, 6, 10, 'Aumento de 10% em quedas de árvores sobre rede'),
(NULL, 'Vento Forte', 'wind', 6, 10, 25, 'Aumento de 25% em quedas de árvores sobre rede'),
(NULL, 'Vento Muito Forte', 'wind', 10, NULL, 50, 'Aumento de 50% em quedas de árvores sobre rede'),
(NULL, 'Calor Extremo', 'temp', 35, NULL, 20, 'Aumento de 20% em sobrecarga de transformadores'),
(NULL, 'Frio Intenso', 'temp', NULL, 10, 10, 'Aumento de 10% em falhas de equipamentos');