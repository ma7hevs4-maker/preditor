-- Create contingency_levels table for storing incident thresholds per polo
CREATE TABLE public.contingency_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polo text NOT NULL UNIQUE,
  normal_min integer NOT NULL DEFAULT 0,
  normal_max integer NOT NULL DEFAULT 0,
  nivel1_min integer NOT NULL DEFAULT 0,
  nivel1_max integer NOT NULL DEFAULT 0,
  nivel2_min integer NOT NULL DEFAULT 0,
  nivel2_max integer NOT NULL DEFAULT 0,
  crise_min integer NOT NULL DEFAULT 0,
  crise_max integer NOT NULL DEFAULT 0,
  extremo_min integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contingency_levels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Níveis de contingência são visíveis publicamente"
ON public.contingency_levels
FOR SELECT
USING (true);

CREATE POLICY "Níveis de contingência podem ser atualizados"
ON public.contingency_levels
FOR UPDATE
USING (true);

CREATE POLICY "Níveis de contingência podem ser inseridos"
ON public.contingency_levels
FOR INSERT
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contingency_levels_updated_at
BEFORE UPDATE ON public.contingency_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data based on the provided table
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Campos', 0, 188, 190, 283, 285, 350, 353, 493, 495),
('Lagos', 0, 225, 228, 263, 265, 363, 365, 638, 640),
('Macaé', 0, 130, 133, 200, 203, 293, 295, 400, 403),
('Noroeste', 0, 145, 148, 158, 160, 270, 273, 403, 405),
('Magé', 0, 158, 160, 205, 208, 265, 268, 425, 428),
('Niterói', 0, 203, 205, 350, 353, 430, 433, 835, 838),
('São Gonçalo', 0, 188, 190, 430, 433, 575, 578, 703, 705),
('Serrana', 0, 158, 160, 243, 245, 338, 340, 545, 548),
('Sul', 0, 140, 143, 270, 273, 400, 403, 558, 560),
('Enel Rio', 0, 1533, 1555, 2400, 2423, 3283, 3285, 4998, 5020);