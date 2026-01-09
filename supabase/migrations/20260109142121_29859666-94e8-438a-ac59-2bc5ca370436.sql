-- Atualizar gatilhos de chuva com valores do Python
UPDATE weather_triggers SET 
  impact_percent_bt = 28, 
  impact_percent_mt = 40,
  impact_percent = 34
WHERE name = 'Chuva Fraca';

UPDATE weather_triggers SET 
  impact_percent_bt = 52, 
  impact_percent_mt = 104,
  impact_percent = 78
WHERE name = 'Chuva Moderada';

UPDATE weather_triggers SET 
  impact_percent_bt = 80, 
  impact_percent_mt = 97,
  impact_percent = 89,
  condition_min = 5,
  condition_max = 10
WHERE name = 'Chuva Forte';

-- Criar gatilho Chuva Muito Forte (>10mm)
INSERT INTO weather_triggers (name, trigger_type, condition_min, condition_max, impact_percent, impact_percent_bt, impact_percent_mt, description, active)
VALUES ('Chuva Muito Forte', 'precip', 10, NULL, 203, 141, 265, 'Aumento de 141% BT e 265% MT em incidentes', true)
ON CONFLICT DO NOTHING;

-- Renomear gatilhos de vento atuais para rajadas
UPDATE weather_triggers SET 
  name = 'Rajada Moderada',
  trigger_type = 'gust',
  description = 'Aumento de 10% em quedas de árvores (rajadas 30-50 km/h)'
WHERE name = 'Vento Moderado';

UPDATE weather_triggers SET 
  name = 'Rajada Forte',
  trigger_type = 'gust',
  description = 'Aumento de 25% em quedas de árvores (rajadas 50-70 km/h)'
WHERE name = 'Vento Forte';

UPDATE weather_triggers SET 
  name = 'Rajada Muito Forte',
  trigger_type = 'gust',
  description = 'Aumento de 50% em quedas de árvores (rajadas >70 km/h)'
WHERE name = 'Vento Muito Forte';

-- Criar gatilhos de vento baseados no Python (convertido de m/s para km/h)
-- 2-4 m/s = 7-14 km/h -> 26.6%
INSERT INTO weather_triggers (name, trigger_type, condition_min, condition_max, impact_percent, impact_percent_bt, impact_percent_mt, description, active)
VALUES ('Vento Leve', 'wind', 7, 14, 27, 27, 27, 'Aumento de 27% em incidentes (vento 7-14 km/h)', true)
ON CONFLICT DO NOTHING;

-- 4-6 m/s = 14-22 km/h -> 68.6%
INSERT INTO weather_triggers (name, trigger_type, condition_min, condition_max, impact_percent, impact_percent_bt, impact_percent_mt, description, active)
VALUES ('Vento Moderado', 'wind', 14, 22, 69, 69, 69, 'Aumento de 69% em incidentes (vento 14-22 km/h)', true)
ON CONFLICT DO NOTHING;

-- 6-10 m/s = 22-36 km/h -> 171.8%
INSERT INTO weather_triggers (name, trigger_type, condition_min, condition_max, impact_percent, impact_percent_bt, impact_percent_mt, description, active)
VALUES ('Vento Forte', 'wind', 22, 36, 172, 172, 172, 'Aumento de 172% em incidentes (vento 22-36 km/h)', true)
ON CONFLICT DO NOTHING;

-- >10 m/s = >36 km/h -> 200%
INSERT INTO weather_triggers (name, trigger_type, condition_min, condition_max, impact_percent, impact_percent_bt, impact_percent_mt, description, active)
VALUES ('Vento Muito Forte', 'wind', 36, NULL, 200, 200, 200, 'Aumento de 200% em incidentes (vento >36 km/h)', true)
ON CONFLICT DO NOTHING;