import { describe, expect, it, vi } from 'vitest'
import {
  deleteProductionActionWithClient,
  mapProductionError,
  setHarvestQuantityWithClient,
  startMachineWithClient,
} from './service'

const machineId = '11111111-1111-4111-8111-111111111111'
const key = '22222222-2222-4222-8222-222222222222'

describe('production service', () => {
  it('rejects an invalid machine id before calling Supabase', async () => {
    const rpc = vi.fn()
    const result = await startMachineWithClient({ machineId: 'bad', idempotencyKey: key }, { rpc } as never)
    expect(result.ok).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('sends the idempotency key and accepts zero bags', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { machineId, harvestId: machineId, quantity: 0 }, error: null })
    const result = await setHarvestQuantityWithClient({ harvestId: machineId, quantity: 0, idempotencyKey: key }, { rpc } as never)
    expect(result.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('set_harvest_quantity', { p_harvest_id: machineId, p_quantity: 0, p_idempotency_key: key })
  })

  it('explains why a second harvest is blocked', () => {
    expect(mapProductionError('PENDING_HARVEST_EXISTS')).toMatchObject({ ok: false, error: { code: 'PENDING_HARVEST_EXISTS' } })
  })

  it('deletes a selected harvest through the protected RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { machineId, harvestId: machineId }, error: null })
    const result = await deleteProductionActionWithClient({
      actionType: 'harvest',
      machineId,
      harvestId: machineId,
      idempotencyKey: key,
    }, { rpc } as never)

    expect(result.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('delete_production_action', {
      p_action_type: 'harvest',
      p_machine_id: machineId,
      p_run_id: null,
      p_harvest_id: machineId,
      p_idempotency_key: key,
    })
  })

  it('explains why an older action cannot be deleted first', () => {
    expect(mapProductionError('DELETE_ACTION_NOT_LATEST')).toMatchObject({
      ok: false,
      error: { code: 'DELETE_ACTION_NOT_LATEST' },
    })
  })
})
