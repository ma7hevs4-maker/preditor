-- Inserir dados históricos padrão para Santo Antônio de Pádua (24 horas)
INSERT INTO historical_data (base_id, hour, bt_productivity, bt_entry_rate, bt_operator_removal, mt_productivity, mt_entry_rate, mt_operator_removal)
SELECT 
  '5fe64b45-858f-48b1-9c2b-76ac6aa432aa'::uuid as base_id,
  h.hour,
  0.60 as bt_productivity,
  3.00 as bt_entry_rate,
  0.50 as bt_operator_removal,
  0.40 as mt_productivity,
  1.00 as mt_entry_rate,
  0.20 as mt_operator_removal
FROM generate_series(0, 23) as h(hour)
WHERE NOT EXISTS (
  SELECT 1 FROM historical_data 
  WHERE base_id = '5fe64b45-858f-48b1-9c2b-76ac6aa432aa' AND historical_data.hour = h.hour
);