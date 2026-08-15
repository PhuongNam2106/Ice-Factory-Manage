import { describe, expect, it } from 'vitest'
import { evaluateClosingChecks } from './service'
import type { ClosingCheckInput } from './types'

function baseInput(overrides: Partial<ClosingCheckInput> = {}): ClosingCheckInput {
  return {
    stockCountExists: true,
    pendingExpenseCount: 0,
    unnamedCreditSaleCount: 0,
    invalidProductionSourceCount: 0,
    invalidDocumentCount: 0,
    stockVariancePct: 0,
    stockWarningPct: 5,
    ...overrides,
  }
}

describe('daily closing rules', () => {
  it('blocks a day with pending expenses', () => {
    expect(evaluateClosingChecks(baseInput({ pendingExpenseCount: 1 }))).toContainEqual(
      expect.objectContaining({ code: 'PENDING_EXPENSES', blocking: true }),
    )
  })

  it('allows a manager reason only for stock variance over threshold', () => {
    expect(
      evaluateClosingChecks(baseInput({ stockVariancePct: 7, stockWarningPct: 5 })),
    ).toContainEqual(
      expect.objectContaining({ code: 'STOCK_VARIANCE', blocking: true, overridable: true }),
    )
  })

  it('blocks when the day has no stock count', () => {
    expect(evaluateClosingChecks(baseInput({ stockCountExists: false }))).toContainEqual(
      expect.objectContaining({ code: 'MISSING_STOCK_COUNT', overridable: false }),
    )
  })

  it('returns no blocking checks for a clean day', () => {
    expect(evaluateClosingChecks(baseInput()).filter((check) => check.blocking)).toEqual([])
  })
})
