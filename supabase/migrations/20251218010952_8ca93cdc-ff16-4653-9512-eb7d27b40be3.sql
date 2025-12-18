-- Tabela de estruturas padrão de equipes por base
CREATE TABLE public.team_structures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id uuid NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Padrão',
  is_default boolean NOT NULL DEFAULT false,
  -- Equipes regulares por hora (24 horas)
  teams_hour_0 integer NOT NULL DEFAULT 0,
  teams_hour_1 integer NOT NULL DEFAULT 0,
  teams_hour_2 integer NOT NULL DEFAULT 0,
  teams_hour_3 integer NOT NULL DEFAULT 0,
  teams_hour_4 integer NOT NULL DEFAULT 0,
  teams_hour_5 integer NOT NULL DEFAULT 0,
  teams_hour_6 integer NOT NULL DEFAULT 0,
  teams_hour_7 integer NOT NULL DEFAULT 0,
  teams_hour_8 integer NOT NULL DEFAULT 0,
  teams_hour_9 integer NOT NULL DEFAULT 0,
  teams_hour_10 integer NOT NULL DEFAULT 0,
  teams_hour_11 integer NOT NULL DEFAULT 0,
  teams_hour_12 integer NOT NULL DEFAULT 0,
  teams_hour_13 integer NOT NULL DEFAULT 0,
  teams_hour_14 integer NOT NULL DEFAULT 0,
  teams_hour_15 integer NOT NULL DEFAULT 0,
  teams_hour_16 integer NOT NULL DEFAULT 0,
  teams_hour_17 integer NOT NULL DEFAULT 0,
  teams_hour_18 integer NOT NULL DEFAULT 0,
  teams_hour_19 integer NOT NULL DEFAULT 0,
  teams_hour_20 integer NOT NULL DEFAULT 0,
  teams_hour_21 integer NOT NULL DEFAULT 0,
  teams_hour_22 integer NOT NULL DEFAULT 0,
  teams_hour_23 integer NOT NULL DEFAULT 0,
  -- Equipes de perdas por hora (24 horas)
  loss_teams_hour_0 integer NOT NULL DEFAULT 0,
  loss_teams_hour_1 integer NOT NULL DEFAULT 0,
  loss_teams_hour_2 integer NOT NULL DEFAULT 0,
  loss_teams_hour_3 integer NOT NULL DEFAULT 0,
  loss_teams_hour_4 integer NOT NULL DEFAULT 0,
  loss_teams_hour_5 integer NOT NULL DEFAULT 0,
  loss_teams_hour_6 integer NOT NULL DEFAULT 0,
  loss_teams_hour_7 integer NOT NULL DEFAULT 0,
  loss_teams_hour_8 integer NOT NULL DEFAULT 0,
  loss_teams_hour_9 integer NOT NULL DEFAULT 0,
  loss_teams_hour_10 integer NOT NULL DEFAULT 0,
  loss_teams_hour_11 integer NOT NULL DEFAULT 0,
  loss_teams_hour_12 integer NOT NULL DEFAULT 0,
  loss_teams_hour_13 integer NOT NULL DEFAULT 0,
  loss_teams_hour_14 integer NOT NULL DEFAULT 0,
  loss_teams_hour_15 integer NOT NULL DEFAULT 0,
  loss_teams_hour_16 integer NOT NULL DEFAULT 0,
  loss_teams_hour_17 integer NOT NULL DEFAULT 0,
  loss_teams_hour_18 integer NOT NULL DEFAULT 0,
  loss_teams_hour_19 integer NOT NULL DEFAULT 0,
  loss_teams_hour_20 integer NOT NULL DEFAULT 0,
  loss_teams_hour_21 integer NOT NULL DEFAULT 0,
  loss_teams_hour_22 integer NOT NULL DEFAULT 0,
  loss_teams_hour_23 integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_structures ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Estruturas são visíveis publicamente" 
ON public.team_structures 
FOR SELECT 
USING (true);

CREATE POLICY "Estruturas podem ser inseridas" 
ON public.team_structures 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Estruturas podem ser atualizadas" 
ON public.team_structures 
FOR UPDATE 
USING (true);

CREATE POLICY "Estruturas podem ser deletadas" 
ON public.team_structures 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_team_structures_updated_at
BEFORE UPDATE ON public.team_structures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca por base
CREATE INDEX idx_team_structures_base_id ON public.team_structures(base_id);