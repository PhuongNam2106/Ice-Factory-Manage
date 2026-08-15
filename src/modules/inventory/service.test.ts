import { describe, expect, it, vi } from 'vitest'
import { recordStockCountWithClient } from './service'

const validInput = {
  operatingDay: '2026-08-15',
  actualBags: '100',
  note: 'Kiểm cuối ngày',
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

describe('inventory service', () => {
  it('validates a count before calling the database', async () => {
    const client = rpcClient()
    const result = await recordStockCountWithClient(
      { ...validInput, actualBags: '-1' },
      client as never,
    )

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('returns the signed adjustment calculated by the transaction', async () => {
    const countId = crypto.randomUUID()
    const client = rpcClient({
      countId,
      varianceBags: '-3',
      variancePct: '2.913',
      requiresReview: false,
    })

    const result = await recordStockCountWithClient(validInput, client as never)

    expect(result).toEqual({
      ok: true,
      data: { countId, varianceBags: '-3', variancePct: '2.913', requiresReview: false },
    })
  })

  it('maps a locked operating day to a stable action error', async () => {
    const result = await recordStockCountWithClient(
      validInput,
      rpcClient(null, { message: 'DAY_LOCKED' }) as never,
    )

    expect(result).toMatchObject({ ok: false, error: { code: 'DAY_LOCKED' } })
  })
})
