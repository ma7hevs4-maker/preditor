import { SimulationRow } from "@/hooks/useSimulation";
import { HistoricalDataRow } from "@/hooks/useHistoricalData";
import { SystemSetting } from "@/hooks/useSystemSettings";

/**
 * Recalculates a simulation based on edited team allocations (eq_disp/eq_perdas).
 * Uses the original simulation's weather and historical data stored in each row.
 */
export const recalculateSimulation = (
  rows: SimulationRow[],
  initialBacklogBT: number,
  initialBacklogMT: number,
  remotoPercent: number = 0.1 // default 10% (matches system_settings operator_removal_percent)
): SimulationRow[] => {
  if (rows.length === 0) return [];

  const result: SimulationRow[] = [];
  let backlog_bt = initialBacklogBT;
  let backlog_mt = initialBacklogMT;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Apply remote reduction in first 8 hours
    let remoto_bt_retirado = 0;
    if (i < 8) {
      remoto_bt_retirado = backlog_bt * remotoPercent;
      backlog_bt = backlog_bt - remoto_bt_retirado;
    }

    // Use entry rates from the original simulation (already includes weather uplift)
    const entrada_bt_adj = row.entrada_bt_adj;
    const entrada_mt_adj = row.entrada_mt_adj;
    const ret_op_bt = row.ret_op_bt;
    const ret_op_mt = row.ret_op_mt;
    
    // Get team allocation from edited values
    const eq_disp = row.eq_disp;
    const eq_perdas = row.eq_perdas;

    // Calculate team allocation: MT first (priority), rest goes to BT
    const eq_mt = Math.min(eq_disp, Math.ceil(backlog_mt + entrada_mt_adj - ret_op_mt));
    const eq_bt = Math.max(0, eq_disp - eq_mt);

    // Capacity = (productivity / 8) * allocated teams
    const bt_productivity = row.bt_productivity;
    const mt_productivity = row.mt_productivity;
    const cap_bt_h = (bt_productivity / 8) * (eq_bt + eq_perdas);
    const cap_mt_h = (mt_productivity / 8) * eq_mt;

    // Calculate new backlog
    const saldo_bt = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_h);
    const saldo_mt = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_h);

    // Remaining hours for ideal calculation
    const horasRestantes = rows.length - i;
    const cap_por_eq_bt = bt_productivity / 8;
    const cap_por_eq_mt = mt_productivity / 8;

    // Targets (from original row or default)
    const TARGET_BT = 70;
    const TARGET_MT = 10;

    const gap_bt = saldo_bt - TARGET_BT;
    const gap_mt = saldo_mt - TARGET_MT;

    const eq_bt_add = gap_bt > 0 && horasRestantes > 0
      ? Math.ceil(gap_bt / (horasRestantes * Math.max(cap_por_eq_bt, 0.1)))
      : 0;
    const eq_mt_add = gap_mt > 0 && horasRestantes > 0
      ? Math.ceil(gap_mt / (horasRestantes * Math.max(cap_por_eq_mt, 0.1)))
      : 0;

    // Ideal teams calculation
    const eq_ideal_bt = gap_bt > 0 && cap_por_eq_bt > 0 
      ? Math.ceil(gap_bt / (horasRestantes * cap_por_eq_bt))
      : 0;
    const eq_ideal_mt = gap_mt > 0 && cap_por_eq_mt > 0 
      ? Math.ceil(gap_mt / (horasRestantes * cap_por_eq_mt))
      : 0;
    const eq_ideal_total = eq_ideal_bt + eq_ideal_mt + eq_bt + eq_mt;

    // Ideal backlog
    const cap_bt_ideal = cap_por_eq_bt * (eq_bt + eq_ideal_bt + eq_perdas);
    const cap_mt_ideal = cap_por_eq_mt * (eq_mt + eq_ideal_mt);
    const saldo_bt_ideal = Math.max(0, backlog_bt + entrada_bt_adj - ret_op_bt - cap_bt_ideal);
    const saldo_mt_ideal = Math.max(0, backlog_mt + entrada_mt_adj - ret_op_mt - cap_mt_ideal);

    result.push({
      ...row,
      eq_disp,
      eq_perdas,
      eq_bt,
      eq_mt,
      cap_bt_h: Math.round(cap_bt_h * 100) / 100,
      cap_mt_h: Math.round(cap_mt_h * 100) / 100,
      incidentes_bt_saldo: Math.round(saldo_bt),
      incidentes_mt_saldo: Math.round(saldo_mt),
      eq_bt_add,
      eq_mt_add,
      saldo_bt_ideal,
      saldo_mt_ideal,
      eq_ideal_total,
      remoto_bt_retirado: Math.round(remoto_bt_retirado * 100) / 100,
    });

    // Update backlog for next iteration
    backlog_bt = saldo_bt;
    backlog_mt = saldo_mt;
  }

  return result;
};
