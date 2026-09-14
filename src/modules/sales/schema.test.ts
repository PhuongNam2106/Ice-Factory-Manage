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

  it('accepts one wholesale quantity without a client-selected price', () => {
    const sale = createSaleSchema.parse({
      ...base,
      kind: 'wholesale',
      customerId: crypto.randomUUID(),
      quantityBags: '10',
      historicalUnitPriceVnd: null,
      paidNowVnd: 0,
    })

    expect(sale).toMatchObject({
      kind: 'wholesale',
      quantityBags: 10,
      historicalUnitPriceVnd: null,
    })
    expect(sale).not.toHaveProperty('lines')
  })

  it('requires a customer for every wholesale sale', () => {
    expect(() => createSaleSchema.parse({
      ...base,
      kind: 'wholesale',
      customerId: null,
      quantityBags: 10,
      historicalUnitPriceVnd: null,
      paidNowVnd: 70000,
    })).toThrow('Khách hàng')
  })

  it('rejects invalid wholesale quantities and historical prices', () => {
    const wholesale = {
      ...base,
      kind: 'wholesale' as const,
      customerId: crypto.randomUUID(),
      quantityBags: 10,
      historicalUnitPriceVnd: null,
      paidNowVnd: 0,
    }

    expect(() => createSaleSchema.parse({ ...wholesale, quantityBags: 0 })).toThrow('Số bao')
    expect(() => createSaleSchema.parse({
      ...wholesale,
      historicalUnitPriceVnd: 0,
    })).toThrow('Đơn giá')
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

    expect(sale).toMatchObject({ kind: 'retail', shiftCode: 'DAY' })
    if (sale.kind !== 'retail') throw new Error('Expected retail sale')
    expect(sale.lines).toHaveLength(2)
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
