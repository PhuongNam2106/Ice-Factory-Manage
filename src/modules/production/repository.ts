import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { DeleteProductionActionInput, ProductionCorrectionInput } from './schema'

export type ProductionClient = Pick<SupabaseClient<Database>, 'rpc'>

export const getProductionBoardRecord = (client: ProductionClient, productionDate: string) =>
  client.rpc('get_production_board', { p_production_date: productionDate })
export const getProductionSummaryRecord = (client: ProductionClient, from: string, to: string) =>
  client.rpc('get_production_summary', { p_from: from, p_to: to })
export const startMachineRecord = (client: ProductionClient, machineId: string, idempotencyKey: string) =>
  client.rpc('start_machine', { p_machine_id: machineId, p_idempotency_key: idempotencyKey })
export const recordHarvestRecord = (client: ProductionClient, machineId: string, idempotencyKey: string) =>
  client.rpc('record_machine_harvest', { p_machine_id: machineId, p_idempotency_key: idempotencyKey })
export const stopMachineRecord = (client: ProductionClient, machineId: string, idempotencyKey: string) =>
  client.rpc('stop_machine', { p_machine_id: machineId, p_idempotency_key: idempotencyKey })
export const setHarvestQuantityRecord = (client: ProductionClient, harvestId: string, quantity: number, idempotencyKey: string) =>
  client.rpc('set_harvest_quantity', { p_harvest_id: harvestId, p_quantity: quantity, p_idempotency_key: idempotencyKey })
export const correctProductionActionRecord = (client: ProductionClient, input: ProductionCorrectionInput, idempotencyKey: string) => {
  const { idempotencyKey: _ignored, ...payload } = input
  void _ignored
  return client.rpc('correct_production_action', { p_input: payload as Json, p_idempotency_key: idempotencyKey })
}
export const deleteProductionActionRecord = (client: ProductionClient, input: DeleteProductionActionInput) => {
  const args = {
    p_action_type: input.actionType,
    p_machine_id: input.machineId,
    p_run_id: input.actionType === 'harvest' ? null : input.runId,
    p_harvest_id: input.actionType === 'harvest' ? input.harvestId : null,
    p_idempotency_key: input.idempotencyKey,
  } as unknown as Database['public']['Functions']['delete_production_action']['Args']
  return client.rpc('delete_production_action', args)
}
export const lockProductionDayRecord = (client: ProductionClient, productionDate: string) =>
  client.rpc('lock_production_day', { p_production_date: productionDate })
export const reopenProductionDayRecord = (client: ProductionClient, productionDate: string) =>
  client.rpc('reopen_production_day', { p_production_date: productionDate })
