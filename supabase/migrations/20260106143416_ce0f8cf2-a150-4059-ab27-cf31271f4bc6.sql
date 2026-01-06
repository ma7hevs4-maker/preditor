-- Add separate impact columns for BT and MT
ALTER TABLE public.weather_triggers
ADD COLUMN impact_percent_bt numeric DEFAULT NULL,
ADD COLUMN impact_percent_mt numeric DEFAULT NULL;

-- Migrate existing data: copy impact_percent to both columns
UPDATE public.weather_triggers
SET impact_percent_bt = impact_percent,
    impact_percent_mt = impact_percent;

-- Add comment for documentation
COMMENT ON COLUMN public.weather_triggers.impact_percent_bt IS 'Impact percentage for BT (Baixa Tensão) incidents';
COMMENT ON COLUMN public.weather_triggers.impact_percent_mt IS 'Impact percentage for MT (Média Tensão) incidents';