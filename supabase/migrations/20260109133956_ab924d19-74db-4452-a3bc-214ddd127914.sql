-- Atualizar gatilhos de chuva com valores diferentes para BT e MT
UPDATE weather_triggers SET impact_percent_bt = 10, impact_percent_mt = 20 WHERE name = 'Chuva Fraca';
UPDATE weather_triggers SET impact_percent_bt = 25, impact_percent_mt = 45 WHERE name = 'Chuva Moderada';
UPDATE weather_triggers SET impact_percent_bt = 45, impact_percent_mt = 75 WHERE name = 'Chuva Forte';