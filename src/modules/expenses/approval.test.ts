import { describe, expect, it } from 'vitest'
import { reviewExpenseSchema, sumApprovedExpenses } from './schema'

describe('expense approval rules', () => {
  it('excludes pending and rejected expenses from official profit', () => {
    expect(
      sumApprovedExpenses([
        { amountVnd: 100_000, status: 'pending' },
        { amountVnd: 200_000, status: 'approved' },
        { amountVnd: 300_000, status: 'rejected' },
      ]),
    ).toBe(200_000)
  })

  it('requires a reason when rejecting', () => {
    expect(() =>
      reviewExpenseSchema.parse({
        expenseId: crypto.randomUUID(),
        decision: 'rejected',
        reason: '',
      }),
    ).toThrow()
  })

  it('allows approval without a reason', () => {
    expect(
      reviewExpenseSchema.parse({
        expenseId: crypto.randomUUID(),
        decision: 'approved',
        reason: '',
      }),
    ).toMatchObject({ decision: 'approved', reason: null })
  })
})
