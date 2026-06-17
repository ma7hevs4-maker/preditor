
-- Add season column to historical_data
ALTER TABLE public.historical_data ADD COLUMN IF NOT EXISTS season TEXT NOT NULL DEFAULT 'verao';
ALTER TABLE public.historical_data ADD CONSTRAINT historical_data_season_check CHECK (season IN ('verao', 'inverno'));

-- Duplicate existing rows for the 'inverno' season (existing rows become 'verao')
INSERT INTO public.historical_data (base_id, hour, bt_productivity, bt_entry_rate, bt_operator_removal, mt_productivity, mt_entry_rate, mt_operator_removal, season)
SELECT base_id, hour, bt_productivity, bt_entry_rate, bt_operator_removal, mt_productivity, mt_entry_rate, mt_operator_removal, 'inverno'
FROM public.historical_data
WHERE season = 'verao'
ON CONFLICT DO NOTHING;

-- Unique constraint per base/hour/season
CREATE UNIQUE INDEX IF NOT EXISTS historical_data_base_hour_season_uidx ON public.historical_data(base_id, hour, season);
