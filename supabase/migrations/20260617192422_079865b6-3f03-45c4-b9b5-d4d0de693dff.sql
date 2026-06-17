ALTER TABLE public.historical_data DROP CONSTRAINT IF EXISTS historical_data_base_id_hour_key;
DROP INDEX IF EXISTS public.historical_data_base_id_hour_key;

INSERT INTO public.historical_data (base_id, hour, bt_productivity, bt_entry_rate, bt_operator_removal, mt_productivity, mt_entry_rate, mt_operator_removal, season)
SELECT base_id, hour, bt_productivity, bt_entry_rate, bt_operator_removal, mt_productivity, mt_entry_rate, mt_operator_removal, 'inverno'
FROM public.historical_data
WHERE season = 'verao'
ON CONFLICT DO NOTHING;