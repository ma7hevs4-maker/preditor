CREATE TABLE public.plan_edit_unlocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id uuid NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  plan_kind text NOT NULL DEFAULT 'planejado',
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  created_by text,
  consumed_dates date[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_edit_unlocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_edit_unlocks TO authenticated;
GRANT ALL ON public.plan_edit_unlocks TO service_role;

ALTER TABLE public.plan_edit_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan edit unlocks" ON public.plan_edit_unlocks FOR SELECT USING (true);
CREATE POLICY "Anyone can create plan edit unlocks" ON public.plan_edit_unlocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update plan edit unlocks" ON public.plan_edit_unlocks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete plan edit unlocks" ON public.plan_edit_unlocks FOR DELETE USING (true);

CREATE INDEX idx_plan_edit_unlocks_base_dates ON public.plan_edit_unlocks (base_id, plan_kind, start_date, end_date);

CREATE TRIGGER update_plan_edit_unlocks_updated_at
BEFORE UPDATE ON public.plan_edit_unlocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();