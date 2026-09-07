import { describe, expect, it } from 'vitest'
import { calculateDailyLoss, dailyLossInputSchema } from './schema'
import * as lossSchema from './schema'

describe('calculateDailyLoss', () => {
  it('calculates a positive loss against production', () => {
    expect(calculateDailyLoss({
      openingBags: 100,
      producedBags: 500,
      soldBags: 450,
      closingBags: 140,
      warningPct: 5,
    })).toEqual({
      differenceBags: 10,
      differencePct: '2',
      classification: 'loss',
      requiresReview: false,
    })
  })

  it('labels a negative difference as surplus', () => {
    expect(calculateDailyLoss({
      openingBags: 0,
      producedBags: 500,
      soldBags: 450,
      closingBags: 60,
      warningPct: 5,
    })).toEqual({
      differenceBags: -10,
      differencePct: '2',
      classification: 'surplus',
      requiresReview: false,
    })
  })

  it('does not invent a percentage when production is zero', () => {
    expect(calculateDailyLoss({
      openingBags: 10,
      producedBags: 0,
      soldBags: 2,
      closingBags: 7,
      warningPct: 5,
    })).toEqual({
      differenceBags: 1,
      differencePct: null,
      classification: 'no_production',
      requiresReview: true,
    })
  })

  it('requires review only when the percentage is strictly above the threshold', () => {
    expect(calculateDailyLoss({ openingBags: 0, producedBags: 100, soldBags: 95, closingBags: 0, warningPct: 5 }).requiresReview).toBe(false)
    expect(calculateDailyLoss({ openingBags: 0, producedBags: 100, soldBags: 94, closingBags: 0, warningPct: 5 }).requiresReview).toBe(true)
  })
})

describe('dailyLossInputSchema', () => {
  const validInput = {
    operatingDay: '2026-09-05',
    closingBags: 140,
    idempotencyKey: '10d47ba2-a319-48be-804f-fae39f892bbb',
  }

  it('accepts an optional first-day opening stock and normalizes an empty note', () => {
    expect(dailyLossInputSchema.parse({ ...validInput, openingBags: 100, note: '' })).toMatchObject({
      openingBags: 100,
      closingBags: 140,
      note: null,
    })
  })

  it('requires closing stock and rejects negative or fractional bag counts', () => {
    expect(dailyLossInputSchema.safeParse({ ...validInput, closingBags: undefined }).success).toBe(false)
    expect(dailyLossInputSchema.safeParse({ ...validInput, closingBags: -1 }).success).toBe(false)
    expect(dailyLossInputSchema.safeParse({ ...validInput, closingBags: 1.5 }).success).toBe(false)
  })
})

describe('resolveSelectableLossDay', () => {
  it('keeps dates inside the configured range and falls back to today otherwise', () => {
    const resolveSelectableLossDay = (
      lossSchema as typeof lossSchema & {
        resolveSelectableLossDay?: (requested: string | undefined, firstDay: string, currentDay: string) => string
      }
    ).resolveSelectableLossDay

    expect(resolveSelectableLossDay).toBeTypeOf('function')
    if (!resolveSelectableLossDay) return

    expect(resolveSelectableLossDay('2026-09-05', '2026-09-05', '2026-09-06')).toBe('2026-09-05')
    expect(resolveSelectableLossDay('2026-09-07', '2026-09-05', '2026-09-06')).toBe('2026-09-06')
    expect(resolveSelectableLossDay('2026-09-04', '2026-09-05', '2026-09-06')).toBe('2026-09-06')
    expect(resolveSelectableLossDay('05/09/2026', '2026-09-05', '2026-09-06')).toBe('2026-09-06')
  })
})
