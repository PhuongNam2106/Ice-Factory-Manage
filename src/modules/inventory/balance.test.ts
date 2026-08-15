import { describe, expect, it } from 'vitest'
import { calculateBalance, calculateStockVariance, stockCountSchema } from './schema'

describe('finished-stock balance and count rules', () => {
  it('calculates expected stock from signed immutable movements', () => {
    expect(
      calculateBalance([
        { direction: 1, quantityBags: '100' },
        { direction: -1, quantityBags: '30.5' },
        { direction: 1, quantityBags: '2' },
      ]),
    ).toBe('71.5')
  })

  it('does not divide by zero when calculating stock variance', () => {
    expect(calculateStockVariance('0', '3', '5')).toEqual({
      bags: '3',
      pct: null,
      requiresReview: true,
    })
  })

  it('marks a variance over the configured threshold for review', () => {
    expect(calculateStockVariance('100', '106', '5')).toEqual({
      bags: '6',
      pct: '6',
      requiresReview: true,
    })
    expect(calculateStockVariance('100', '104.5', '5')).toEqual({
      bags: '4.5',
      pct: '4.5',
      requiresReview: false,
    })
  })

  it('rejects negative physical counts', () => {
    expect(() =>
      stockCountSchema.parse({
        operatingDay: '2026-08-15',
        actualBags: '-1',
        note: null,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).toThrow()
  })
})
