-- Atualizar faixas de gatilho de chuva
-- Chuva Fraca: 0.2-3mm
UPDATE weather_triggers 
SET condition_min = 0.2, condition_max = 3, updated_at = now()
WHERE name = 'Chuva Fraca' AND trigger_type = 'precip';

-- Chuva Moderada: 3-6mm (iniciando onde Fraca termina)
UPDATE weather_triggers 
SET condition_min = 3, condition_max = 6, updated_at = now()
WHERE name = 'Chuva Moderada' AND trigger_type = 'precip';

-- Chuva Forte: 6-10mm (iniciando onde Moderada termina)
UPDATE weather_triggers 
SET condition_min = 6, condition_max = 10, updated_at = now()
WHERE name = 'Chuva Forte' AND trigger_type = 'precip';

-- Chuva Muito Forte: >10mm (mantém)
UPDATE weather_triggers 
SET condition_min = 10, condition_max = NULL, updated_at = now()
WHERE name = 'Chuva Muito Forte' AND trigger_type = 'precip';