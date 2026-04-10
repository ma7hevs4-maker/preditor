INSERT INTO public.system_settings (key, value, description) VALUES 
  ('ranking_weight_incidentes', '15', 'Peso da métrica Incidentes no ranking de equipes (quanto maior, melhor)'),
  ('ranking_weight_improdutivos', '10', 'Peso da métrica Improdutivos no ranking (quanto menor, melhor)'),
  ('ranking_weight_reincidentes', '10', 'Peso da métrica Reincidentes no ranking (quanto menor, melhor)'),
  ('ranking_weight_ocupacao', '15', 'Peso da métrica Ocupação no ranking (quanto maior, melhor)'),
  ('ranking_weight_ociosidade', '15', 'Peso da métrica Ociosidade no ranking (quanto menor, melhor)'),
  ('ranking_weight_inc_ociosidade', '10', 'Peso da métrica Inc. Ociosidade no ranking (quanto menor, melhor)'),
  ('ranking_weight_login', '5', 'Peso da métrica Login no ranking (quanto menor, melhor)'),
  ('ranking_weight_despacho', '5', 'Peso da métrica Despacho no ranking (quanto menor, melhor)'),
  ('ranking_weight_plataforma', '10', 'Peso da métrica Tempo de Plataforma no ranking (quanto menor, melhor)'),
  ('ranking_weight_retorno', '5', 'Peso da métrica Retorno Base no ranking (quanto menor, melhor)')
ON CONFLICT (key) DO NOTHING;