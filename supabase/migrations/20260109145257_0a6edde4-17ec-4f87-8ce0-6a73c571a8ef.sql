-- Desativar gatilhos de vento (manter apenas rajadas)
UPDATE weather_triggers 
SET active = false 
WHERE trigger_type = 'wind';