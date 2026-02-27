
ALTER TABLE public.team_structures
ADD COLUMN type_data_snapshot jsonb DEFAULT NULL;

COMMENT ON COLUMN public.team_structures.type_data_snapshot IS 'JSON snapshot of team type breakdown per hour, e.g. {"Emergência": [0,0,...], "Gestores": [1,1,...]}';
