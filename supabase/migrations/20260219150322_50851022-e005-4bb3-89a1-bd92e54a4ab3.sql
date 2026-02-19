
-- Table for team type entries (normalized: one row per plan × type × hour)
CREATE TABLE public.daily_team_type_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_plan_id UUID NOT NULL REFERENCES public.daily_team_plans(id) ON DELETE CASCADE,
  team_type TEXT NOT NULL,
  hour INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(daily_plan_id, team_type, hour)
);

-- Index for fast lookups
CREATE INDEX idx_daily_team_type_entries_plan ON public.daily_team_type_entries(daily_plan_id);

-- Enable RLS
ALTER TABLE public.daily_team_type_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entradas de tipo são visíveis publicamente"
  ON public.daily_team_type_entries FOR SELECT USING (true);

CREATE POLICY "Entradas de tipo podem ser inseridas"
  ON public.daily_team_type_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Entradas de tipo podem ser atualizadas"
  ON public.daily_team_type_entries FOR UPDATE USING (true);

CREATE POLICY "Entradas de tipo podem ser deletadas"
  ON public.daily_team_type_entries FOR DELETE USING (true);
