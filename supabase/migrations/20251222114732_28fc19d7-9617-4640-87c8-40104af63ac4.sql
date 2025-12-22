-- Create table for simulation history
CREATE TABLE public.simulation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_id UUID NOT NULL REFERENCES public.bases(id),
  name TEXT NOT NULL DEFAULT 'Simulação',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Initial conditions
  bt_initial_backlog INTEGER NOT NULL DEFAULT 0,
  mt_initial_backlog INTEGER NOT NULL DEFAULT 0,
  horizon_hours INTEGER NOT NULL DEFAULT 24,
  
  -- Weather settings
  weather_provider TEXT NOT NULL DEFAULT 'openmeteo',
  weather_impact_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Team structure used (snapshot)
  team_structure_id UUID REFERENCES public.team_structures(id),
  team_structure_snapshot JSONB,
  
  -- Simulation results snapshot
  results_snapshot JSONB NOT NULL,
  
  -- Weather data snapshot
  weather_snapshot JSONB,
  
  -- Metadata
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.simulation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same pattern as other tables)
CREATE POLICY "Histórico é visível publicamente" 
ON public.simulation_history 
FOR SELECT 
USING (true);

CREATE POLICY "Histórico pode ser inserido" 
ON public.simulation_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Histórico pode ser deletado" 
ON public.simulation_history 
FOR DELETE 
USING (true);

-- Add index for faster queries by base
CREATE INDEX idx_simulation_history_base_id ON public.simulation_history(base_id);
CREATE INDEX idx_simulation_history_created_at ON public.simulation_history(created_at DESC);