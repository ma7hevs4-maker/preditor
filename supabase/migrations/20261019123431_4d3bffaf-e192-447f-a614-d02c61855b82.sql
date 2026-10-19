CREATE TABLE public.duty_roster_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id uuid NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  roster_date date NOT NULL,
  position integer NOT NULL DEFAULT 0,
  full_name text NOT NULL,
  role text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'escala',
  start_time text,
  end_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_duty_roster_date ON public.duty_roster_entries(roster_date, base_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duty_roster_entries TO anon, authenticated;
GRANT ALL ON public.duty_roster_entries TO service_role;
ALTER TABLE public.duty_roster_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Escala visível" ON public.duty_roster_entries FOR SELECT USING (true);
CREATE POLICY "Escala inserível" ON public.duty_roster_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Escala atualizável" ON public.duty_roster_entries FOR UPDATE USING (true);
CREATE POLICY "Escala deletável" ON public.duty_roster_entries FOR DELETE USING (true);
CREATE TRIGGER update_duty_roster_updated_at BEFORE UPDATE ON public.duty_roster_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();