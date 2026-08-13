import { describe, expect, it, vi } from 'vitest'
import {
  createProductionBatchWithClient,
  createProductionShiftTotalWithClient,
  selectOfficialProductionSourceWithClient,
} from './service'

const validBatch = {
  operatingDay: '2026-08-13',
  shiftCode: 'ca_sang' as const,
  machineId: crypto.randomUUID(),
  startTime: '2026-08-13T00:00:00.000Z',
  endTime: '2026-08-13T04:00:00.000Z',
  goodBags: 120,
  rejectedBags: 2,
  note: null,
  idempotencyKey: crypto.randomUUID(),
}

function rpcClient(data: unknown = null, error: { message: string } | null = null) {
  return {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe('production service', () => {
  it('validates before calling the batch RPC', async () => {
    const client = rpcClient()
    const result = await createProductionBatchWithClient(
      { ...validBatch, endTime: validBatch.startTime },
      client as never,
    )

    expect(result.ok).toBe(false)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('calls each write RPC with its idempotency key', async () => {
    const batchClient = rpcClient({ batchId: crypto.randomUUID() })
    const batchResult = await createProductionBatchWithClient(validBatch, batchClient as never)
    expect(batchResult.ok).toBe(true)
    expect(batchClient.rpc).toHaveBeenCalledWith('record_production_batch', {
      p_input: expect.not.objectContaining({ idempotencyKey: expect.anything() }),
      p_idempotency_key: validBatch.idempotencyKey,
    })

    const shiftInput = {
      operatingDay: validBatch.operatingDay,
      shiftCode: validBatch.shiftCode,
      machineId: validBatch.machineId,
      goodBags: 125,
      rejectedBags: 1,
      note: null,
      idempotencyKey: crypto.randomUUID(),
    }
    const shiftClient = rpcClient({ shiftTotalId: crypto.randomUUID() })
    expect(await createProductionShiftTotalWithClient(shiftInput, shiftClient as never)).toMatchObject({ ok: true })

    const selectionInput = {
      operatingDay: validBatch.operatingDay,
      shiftCode: validBatch.shiftCode,
      machineId: validBatch.machineId,
      selectedSource: 'shift_total' as const,
      idempotencyKey: crypto.randomUUID(),
    }
    const selectionClient = rpcClient({ selectionId: crypto.randomUUID() })
    expect(await selectOfficialProductionSourceWithClient(selectionInput, selectionClient as never)).toMatchObject({ ok: true })
  })

  it('maps a locked day and manager-only confirmation to clear errors', async () => {
    const locked = await createProductionBatchWithClient(
      validBatch,
      rpcClient(null, { message: 'DAY_LOCKED' }) as never,
    )
    expect(locked).toMatchObject({ ok: false, error: { code: 'DAY_LOCKED' } })

    const forbidden = await selectOfficialProductionSourceWithClient(
      {
        operatingDay: validBatch.operatingDay,
        shiftCode: validBatch.shiftCode,
        machineId: validBatch.machineId,
        selectedSource: 'batches',
        idempotencyKey: crypto.randomUUID(),
      },
      rpcClient(null, { message: 'FORBIDDEN' }) as never,
    )
    expect(forbidden).toMatchObject({ ok: false, error: { code: 'MANAGER_REQUIRED' } })
  })
})
