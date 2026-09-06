import { describe, expect, it } from 'vitest'
import { evaluateClosingChecks } from './service'
import type { ClosingCheckInput } from './types'

function baseInput(overrides: Partial<ClosingCheckInput> = {}): ClosingCheckInput {
  return {
    lossReportExists: true,
    previousDayReady: true,
    pendingHarvestCount: 0,
    lossReportStale: false,
    lossRequiresReview: false,
    lossWarningConfirmed: false,
    pendingExpenseCount: 0,
    unnamedCreditSaleCount: 0,
    invalidDocumentCount: 0,
    ...overrides,
  }
}

describe('daily closing rules', () => {
  it.each([
    [{ lossReportExists: false }, 'MISSING_LOSS_REPORT'],
    [{ previousDayReady: false }, 'PREVIOUS_DAY_NOT_READY'],
    [{ pendingHarvestCount: 1 }, 'PENDING_HARVEST_QUANTITY'],
    [{ lossReportStale: true }, 'LOSS_REPORT_STALE'],
  ] as const)('blocks an incomplete loss condition %s', (override, code) => {
    expect(evaluateClosingChecks(baseInput(override))).toContainEqual(
      expect.objectContaining({ code, blocking: true, overridable: false }),
    )
  })

  it('requires a separate manager confirmation for an over-threshold loss', () => {
    expect(evaluateClosingChecks(baseInput({ lossRequiresReview: true }))).toContainEqual(
      expect.objectContaining({ code: 'LOSS_REVIEW_REQUIRED', blocking: true, overridable: false }),
    )
    expect(evaluateClosingChecks(baseInput({ lossRequiresReview: true, lossWarningConfirmed: true }))).not.toContainEqual(
      expect.objectContaining({ code: 'LOSS_REVIEW_REQUIRED' }),
    )
  })

  it('retains unrelated expense and document blockers', () => {
    const checks = evaluateClosingChecks(baseInput({ pendingExpenseCount: 1, invalidDocumentCount: 1 }))
    expect(checks).toContainEqual(expect.objectContaining({ code: 'PENDING_EXPENSES' }))
    expect(checks).toContainEqual(expect.objectContaining({ code: 'INVALID_DOCUMENTS' }))
  })

  it('returns no blocking checks for a clean day', () => {
    expect(evaluateClosingChecks(baseInput()).filter((check) => check.blocking)).toEqual([])
  })
})
