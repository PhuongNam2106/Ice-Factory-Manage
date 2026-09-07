import { describe, expect, it, vi } from 'vitest'
import { correctDocumentOccurredAtWithClient } from './document-time'

const validInput = {
  entityType: 'sale' as const,
  entityId: crypto.randomUUID(),
  expectedVersion: 2,
  occurredAt: '2026-09-06T13:00:00.000Z',
  idempotencyKey: crypto.randomUUID(),
}

function rpcClient(data: unknown = null, error: { message: string } | null = null) {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) }
}

describe('correctDocumentOccurredAtWithClient', () => {
  it('rejects malformed input before calling the database', async () => {
    const client = rpcClient()
    const result = await correctDocumentOccurredAtWithClient(
      { ...validInput, occurredAt: '06/09/2026 20:00' },
      client as never,
    )

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } })
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('returns the new version from the database transaction', async () => {
    const client = rpcClient({
      entityType: 'sale',
      entityId: validInput.entityId,
      operatingDay: '2026-09-06',
      occurredAt: validInput.occurredAt,
      version: 3,
    })

    const result = await correctDocumentOccurredAtWithClient(validInput, client as never)

    expect(result).toEqual({
      ok: true,
      data: {
        entityType: 'sale',
        entityId: validInput.entityId,
        operatingDay: '2026-09-06',
        occurredAt: validInput.occurredAt,
        version: 3,
      },
    })
  })

  it('maps locked-day and stale-version failures to stable messages', async () => {
    const locked = await correctDocumentOccurredAtWithClient(
      validInput,
      rpcClient(null, { message: 'DAY_LOCKED' }) as never,
    )
    const stale = await correctDocumentOccurredAtWithClient(
      validInput,
      rpcClient(null, { message: 'VERSION_CONFLICT' }) as never,
    )

    expect(locked).toMatchObject({ ok: false, error: { code: 'DAY_LOCKED' } })
    expect(stale).toMatchObject({ ok: false, error: { code: 'VERSION_CONFLICT' } })
  })
})
