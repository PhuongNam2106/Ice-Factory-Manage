import { describe, expect, it } from 'vitest'
import {
  calculateProductionVariance,
  productionBatchSchema,
  productionShiftTotalSchema,
  resolveOfficialQuantity,
} from './schema'

describe('production reconciliation and schemas', () => {
  it('does not add batch and shift totals together', () => {
    expect(
      resolveOfficialQuantity({
        source: 'shift_total',
        batchGoodBags: 120,
        shiftGoodBags: 125,
      }),
    ).toBe('125')

    expect(
      resolveOfficialQuantity({
        source: 'batches',
        batchGoodBags: 120,
        shiftGoodBags: 125,
      }),
    ).toBe('120')
  })

  it('shows the signed difference and percentage for review', () => {
    expect(calculateProductionVariance('120', '125')).toEqual({
      bags: '5',
      pct: '4.167',
      hasDiscrepancy: true,
    })

    expect(calculateProductionVariance('100', '100')).toEqual({
      bags: '0',
      pct: '0',
      hasDiscrepancy: false,
    })
  })

  it('does not invent an infinite percentage when the batch total is zero', () => {
    expect(calculateProductionVariance('0', '5')).toEqual({
      bags: '5',
      pct: null,
      hasDiscrepancy: true,
    })
  })

  it('validates batch end time must be after start time', () => {
    expect(() =>
      productionBatchSchema.parse({
        operatingDay: '2026-08-12',
        shiftCode: 'ca_sang',
        machineId: crypto.randomUUID(),
        startTime: '2026-08-12T08:00:00Z',
        endTime: '2026-08-12T07:30:00Z',
        goodBags: 50,
        rejectedBags: 2,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).toThrow('thời gian')
  })

  it('rejects negative good or rejected bags', () => {
    expect(() =>
      productionShiftTotalSchema.parse({
        operatingDay: '2026-08-12',
        shiftCode: 'ca_sang',
        machineId: crypto.randomUUID(),
        goodBags: -10,
        rejectedBags: 0,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).toThrow()
  })
})
