CREATE TABLE public.weather_decay_curves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id uuid NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'NORMAL',
  level text NOT NULL,
  trigger_type text NOT NULL,
  trigger_name text NOT NULL,
  hour_1 numeric NOT NULL DEFAULT 0,
  hour_2 numeric NOT NULL DEFAULT 0,
  hour_3 numeric NOT NULL DEFAULT 0,
  hour_4 numeric NOT NULL DEFAULT 0,
  hour_5 numeric NOT NULL DEFAULT 0,
  hour_6 numeric NOT NULL DEFAULT 0,
  hour_7 numeric NOT NULL DEFAULT 0,
  hour_8 numeric NOT NULL DEFAULT 0,
  hour_9 numeric NOT NULL DEFAULT 0,
  hour_10 numeric NOT NULL DEFAULT 0,
  hour_11 numeric NOT NULL DEFAULT 0,
  hour_12 numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (base_id, period, level, trigger_type, trigger_name)
);

GRANT SELECT ON public.weather_decay_curves TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weather_decay_curves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weather_decay_curves TO anon;
GRANT ALL ON public.weather_decay_curves TO service_role;

ALTER TABLE public.weather_decay_curves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view decay curves" ON public.weather_decay_curves FOR SELECT USING (true);
CREATE POLICY "Anyone can insert decay curves" ON public.weather_decay_curves FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update decay curves" ON public.weather_decay_curves FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete decay curves" ON public.weather_decay_curves FOR DELETE USING (true);

CREATE TRIGGER update_weather_decay_curves_updated_at
BEFORE UPDATE ON public.weather_decay_curves
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();