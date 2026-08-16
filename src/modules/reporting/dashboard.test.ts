import { describe, expect, it } from 'vitest'
import { buildDashboard, buildRevenueKpis } from './dashboard-service'

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
})
