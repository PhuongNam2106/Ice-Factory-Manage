import { describe, expect, it } from 'vitest'
import { recordReceiptSchema } from './schema'

const base = {
  customerId: crypto.randomUUID(),
  occurredAt: '2026-09-06T12:50:00.000Z',
  amountVnd: 100000,
  paymentMethod: 'bank_transfer' as const,
  note: 'Thanh toán nợ',
  idempotencyKey: crypto.randomUUID(),
}

describe('recordReceiptSchema', () => {
  it('derives the operating day later from an optional occurrence timestamp', () => {
    const receipt = recordReceiptSchema.parse({ ...base, allocations: [] })

    expect(receipt.occurredAt).toBe('2026-09-06T12:50:00.000Z')
    expect(receipt).not.toHaveProperty('operatingDay')
  })

  it('rejects allocation total above the receipt amount', () => {
    expect(() =>
      recordReceiptSchema.parse({
        ...base,
        allocations: [
          { receivableId: crypto.randomUUID(), amountVnd: 100001 },
        ],
      }),
    ).toThrow('phân bổ')
  })

  it('allows valid partial allocations within receipt amount', () => {
    const recId1 = crypto.randomUUID()
    const recId2 = crypto.randomUUID()

    const parsed = recordReceiptSchema.parse({
      ...base,
      amountVnd: 200000,
      allocations: [
        { receivableId: recId1, amountVnd: 80000 },
        { receivableId: recId2, amountVnd: 70000 },
      ],
    })

    expect(parsed.allocations).toHaveLength(2)
    expect(parsed.amountVnd).toBe(200000)
  })

  it('allows zero allocations (unallocated receipt)', () => {
    const parsed = recordReceiptSchema.parse({
      ...base,
      allocations: [],
    })

    expect(parsed.allocations).toHaveLength(0)
  })

  it('rejects negative or non-integer receipt amounts', () => {
    expect(() =>
      recordReceiptSchema.parse({
        ...base,
        amountVnd: -50000,
        allocations: [],
      }),
    ).toThrow()

    expect(() =>
      recordReceiptSchema.parse({
        ...base,
        amountVnd: 100.5,
        allocations: [],
      }),
    ).toThrow()
  })

  it('rejects duplicate receivable ids in allocations', () => {
    const recId = crypto.randomUUID()
    expect(() =>
      recordReceiptSchema.parse({
        ...base,
        amountVnd: 100000,
        allocations: [
          { receivableId: recId, amountVnd: 30000 },
          { receivableId: recId, amountVnd: 40000 },
        ],
      }),
    ).toThrow('Lặp')
  })
})
