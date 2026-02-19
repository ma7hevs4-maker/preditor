
CREATE TABLE public.daily_team_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
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
  loss_teams_hour_0 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_1 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_2 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_3 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_4 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_5 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_6 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_7 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_8 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_9 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_10 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_11 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_12 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_13 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_14 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_15 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_16 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_17 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_18 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_19 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_20 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_21 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_22 INTEGER NOT NULL DEFAULT 0,
  loss_teams_hour_23 INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_id, plan_date)
);

ALTER TABLE public.daily_team_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos diários são visíveis publicamente" ON public.daily_team_plans FOR SELECT USING (true);
CREATE POLICY "Planos diários podem ser inseridos" ON public.daily_team_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Planos diários podem ser atualizados" ON public.daily_team_plans FOR UPDATE USING (true);
CREATE POLICY "Planos diários podem ser deletados" ON public.daily_team_plans FOR DELETE USING (true);

CREATE TRIGGER update_daily_team_plans_updated_at
  BEFORE UPDATE ON public.daily_team_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
