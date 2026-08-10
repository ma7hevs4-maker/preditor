ALTER TABLE public.daily_team_plans
  ADD COLUMN IF NOT EXISTS plan_kind text NOT NULL DEFAULT 'planejado';

ALTER TABLE public.daily_team_plans
  DROP CONSTRAINT IF EXISTS daily_team_plans_base_id_plan_date_key;

ALTER TABLE public.daily_team_plans
  ADD CONSTRAINT daily_team_plans_base_date_kind_key UNIQUE (base_id, plan_date, plan_kind);

ALTER TABLE public.daily_team_plans
  DROP CONSTRAINT IF EXISTS daily_team_plans_plan_kind_check;

ALTER TABLE public.daily_team_plans
  ADD CONSTRAINT daily_team_plans_plan_kind_check CHECK (plan_kind IN ('planejado', 'realizado'));

CREATE TABLE IF NOT EXISTS public.daily_plan_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  plan_kind text NOT NULL DEFAULT 'realizado',
  action text NOT NULL DEFAULT 'update',
  author text,
  note text,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.daily_plan_change_logs TO anon;
GRANT SELECT, INSERT ON public.daily_plan_change_logs TO authenticated;
GRANT ALL ON public.daily_plan_change_logs TO service_role;

ALTER TABLE public.daily_plan_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs de estrutura são visíveis publicamente"
  ON public.daily_plan_change_logs FOR SELECT USING (true);

CREATE POLICY "Logs de estrutura podem ser inseridos"
  ON public.daily_plan_change_logs FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_daily_plan_change_logs_lookup
  ON public.daily_plan_change_logs (base_id, plan_date, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_team_plans_date_kind
  ON public.daily_team_plans (plan_date, plan_kind);