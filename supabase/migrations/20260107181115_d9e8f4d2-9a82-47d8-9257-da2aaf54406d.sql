-- Update wind triggers to use km/h values instead of m/s
-- Moderate Wind: 30-50 km/h (previously 4-6 m/s)
UPDATE weather_triggers 
SET condition_min = 30, condition_max = 50 
WHERE trigger_type = 'wind' AND name = 'Vento Moderado';

-- Strong Wind: 50-70 km/h (previously 6-10 m/s)
UPDATE weather_triggers 
SET condition_min = 50, condition_max = 70 
WHERE trigger_type = 'wind' AND name = 'Vento Forte';

-- Very Strong Wind: >= 70 km/h (previously >= 10 m/s)
UPDATE weather_triggers 
SET condition_min = 70, condition_max = NULL 
WHERE trigger_type = 'wind' AND name = 'Vento Muito Forte';