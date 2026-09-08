import { describe, expect, it, vi } from 'vitest'
import {
  addHistoricalMachineRunWithClient,
  correctProductionActionWithClient,
  deleteProductionActionWithClient,
  mapProductionError,
  setHarvestQuantityWithClient,
  startMachineWithClient,
} from './service'

const machineId = '11111111-1111-4111-8111-111111111111'
const key = '22222222-2222-4222-8222-222222222222'

describe('production service', () => {
  it('accepts null identifiers returned for fields that do not apply to a correction', async () => {
    const harvestId = '33333333-3333-4333-8333-333333333333'
    const rpc = vi.fn().mockResolvedValue({
      data: {
        actionType: 'add_harvest',
        machineId,
        runId: null,
        harvestId,
      },
      error: null,
    })

    const result = await correctProductionActionWithClient({
      actionType: 'add_harvest',
      machineId,
      occurredAt: '2026-09-01T21:00:00+07:00',
      bagQuantity: 12,
      idempotencyKey: key,
    }, { rpc } as never)

    expect(result).toEqual({
      ok: true,
      data: { machineId, harvestId },
    })
  })

  it('creates a complete historical run through one protected RPC call', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        machineId,
        runId: key,
        productionDate: '2026-09-01',
        startedAt: '2026-09-01T13:00:00.000Z',
        stoppedAt: '2026-09-01T14:00:00.000Z',
      },
      error: null,
    })

    const result = await addHistoricalMachineRunWithClient({
      machineId,
      productionDate: '2026-09-01',
      startedAt: '2026-09-01T20:00:00+07:00',
      stoppedAt: '2026-09-01T21:00:00+07:00',
      idempotencyKey: key,
    }, { rpc } as never)

    expect(result.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('add_historical_machine_run', {
      p_machine_id: machineId,
      p_production_date: '2026-09-01',
      p_started_at: '2026-09-01T20:00:00+07:00',
      p_stopped_at: '2026-09-01T21:00:00+07:00',
      p_idempotency_key: key,
    })
  })

  it('rejects a historical run that stops before it starts', async () => {
    const rpc = vi.fn()
    const result = await addHistoricalMachineRunWithClient({
      machineId,
      productionDate: '2026-09-01',
      startedAt: '2026-09-01T21:00:00+07:00',
      stoppedAt: '2026-09-01T20:00:00+07:00',
      idempotencyKey: key,
    }, { rpc } as never)

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    expect(rpc).not.toHaveBeenCalled()
  })

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

  it('explains why a backfilled harvest cannot be attached to a machine run', () => {
    expect(mapProductionError('RUN_NOT_FOUND_FOR_TIME')).toMatchObject({
      ok: false,
      error: {
        code: 'RUN_NOT_FOUND_FOR_TIME',
        message: 'Không tìm thấy phiên chạy chứa thời gian này. Hãy nhập giờ bắt đầu và giờ tắt máy đúng trước khi thêm lần xả.',
      },
    })
  })
})
