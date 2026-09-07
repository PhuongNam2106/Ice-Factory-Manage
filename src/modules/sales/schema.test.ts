import { describe, expect, it } from 'vitest'
import { createSaleSchema } from './schema'

const base = {
  occurredAt: null,
  paymentMethod: 'cash' as const,
  note: '',
  idempotencyKey: crypto.randomUUID(),
}

describe('createSaleSchema', () => {
  it('accepts server-time entry without a client-selected operating day', () => {
    const sale = createSaleSchema.parse({
      ...base,
      kind: 'retail',
      shiftCode: 'DAY',
      lines: [{ quantityBags: 2, unitPriceVnd: 10000 }],
      paidNowVnd: 20000,
    })

    expect(sale.occurredAt).toBeNull()
    expect(sale).not.toHaveProperty('operatingDay')
  })

  it('requires a customer when wholesale credit remains', () => {
    expect(() =>
      createSaleSchema.parse({
        ...base,
        kind: 'wholesale',
        customerId: null,
        lines: [{ quantityBags: '10', unitPriceVnd: 7000 }],
        paidNowVnd: 0,
      }),
    ).toThrow('Khách hàng')
  })

  it('supports multiple retail prices in one shift', () => {
    const sale = createSaleSchema.parse({
      ...base,
      kind: 'retail',
      shiftCode: ' day ',
      lines: [
        { quantityBags: '5', unitPriceVnd: 12000 },
        { quantityBags: '3', unitPriceVnd: 10000 },
      ],
      paidNowVnd: 90000,
    })

    expect(sale.lines).toHaveLength(2)
    expect(sale).toMatchObject({ kind: 'retail', shiftCode: 'DAY' })
  })

  it('rejects an amount received above the server-derived total', () => {
    expect(() =>
      createSaleSchema.parse({
        ...base,
        kind: 'retail',
        shiftCode: 'DAY',
        lines: [{ quantityBags: '2', unitPriceVnd: 10000 }],
        paidNowVnd: 20001,
      }),
    ).toThrow('vượt')
  })

  it('rejects a retail sale where amount received is less than total', () => {
    expect(() =>
      createSaleSchema.parse({
        ...base,
        kind: 'retail',
        shiftCode: 'DAY',
        lines: [{ quantityBags: '2', unitPriceVnd: 10000 }],
        paidNowVnd: 15000,
      }),
    ).toThrow('Bán lẻ phải thu đủ 100% tổng tiền')
  })

  it('rejects zero, fractional, or negative bag quantities and prices', () => {
    for (const line of [
      { quantityBags: '0', unitPriceVnd: 7000 },
      { quantityBags: '1.5', unitPriceVnd: 7000 },
      { quantityBags: '1', unitPriceVnd: -1 },
    ]) {
      expect(() =>
        createSaleSchema.parse({
          ...base,
          kind: 'retail',
          shiftCode: 'DAY',
          lines: [line],
          paidNowVnd: 0,
        }),
      ).toThrow()
    }
  })
})
