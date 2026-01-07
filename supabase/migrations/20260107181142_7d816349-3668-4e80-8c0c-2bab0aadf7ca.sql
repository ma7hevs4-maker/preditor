-- Allow UPDATE on simulation_history for editing saved simulations
CREATE POLICY "Histórico pode ser atualizado" 
ON simulation_history 
FOR UPDATE 
USING (true);