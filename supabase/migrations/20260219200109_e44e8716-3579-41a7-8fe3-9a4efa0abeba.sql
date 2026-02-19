-- Add regional_label column to simulation_history
-- This stores the regional/base name (e.g. "Lagos", "Noroeste") 
-- when a simulation is run at the regional level (with multiple sucursais)
ALTER TABLE public.simulation_history
  ADD COLUMN IF NOT EXISTS regional_label text;

-- Add index for faster filtering by regional
CREATE INDEX IF NOT EXISTS simulation_history_regional_label_idx
  ON public.simulation_history (regional_label)
  WHERE regional_label IS NOT NULL;
