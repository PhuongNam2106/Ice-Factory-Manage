import { describe, expect, it } from 'vitest'
import { assembleDailyDashboard, buildDashboard, buildRevenueKpis } from './dashboard-service'
import type { DashboardRow } from './types'

describe('dashboard calculations', () => {
  it('uses approved expenses only for official profit', () => {
    expect(buildDashboard({
      revenueVnd: 1_000_000,
      approvedExpenseVnd: 200_000,
      pendingExpenseVnd: 50_000,
    })).toMatchObject({ officialProfitVnd: 800_000, pendingExpenseVnd: 50_000 })
  })

  it('keeps wholesale and retail revenue separate and reconciled', () => {
    expect(buildRevenueKpis({ wholesaleVnd: 700_000, retailVnd: 300_000 })).toEqual({
      wholesaleVnd: 700_000,
      retailVnd: 300_000,
      totalVnd: 1_000_000,
    })
  })

  it('preserves a signed surplus and a nullable loss rate', () => {
    const row: DashboardRow = {
      day: '2026-09-05', status: 'open', wholesaleRevenueVnd: 0, retailRevenueVnd: 0,
      collectedVnd: 0, newDebtVnd: 0, totalDebtVnd: 0, productionBags: 0, soldBags: 0,
      openingBags: 100, expectedClosingBags: 100, closingBags: 105, differenceBags: -5,
      differencePct: null, lossClassification: 'no_production', lossRequiresReview: true,
      lossReportStale: false, lossReportExists: true, lossWarningPct: 5, pendingHarvestCount: 0,
      approvedExpenseVnd: 0, pendingExpenseVnd: 0, pendingExpenseCount: 0,
      overdueDebtVnd: 0, previousDayUnlocked: false,
    }
    expect(assembleDailyDashboard(row, [])).toMatchObject({ differenceBags: -5, differencePct: null })
  })
})
