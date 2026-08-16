import { describe, expect, it } from 'vitest'
import { detectOutlier, getOperationalAlerts } from './alerts'

describe('reporting alerts', () => {
  it('marks values outside half-to-double the previous median as informational', () => {
    const history = [100, 95, 105, 98, 102]
    expect(detectOutlier(220, history)).toBe(true)
    expect(detectOutlier(45, history)).toBe(true)
    expect(detectOutlier(150, history)).toBe(false)
  })

  it('compares against the 30 most recent previous records only', () => {
    const recent = Array<number>(30).fill(10)
    const older = Array<number>(30).fill(100)

    expect(detectOutlier(60, [...recent, ...older])).toBe(true)
  })

  it('surfaces pending expense and overdue debt without blocking data entry', () => {
    expect(getOperationalAlerts({
      stockVariancePct: 0,
      stockWarningPct: 5,
      stockBalanceBags: 10,
      overdueDebtVnd: 200_000,
      pendingExpenseCount: 2,
      productionMismatchCount: 0,
      previousDayUnlocked: false,
      hasOutlier: false,
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'OVERDUE_DEBT', severity: 'warning', blocking: false }),
      expect.objectContaining({ code: 'PENDING_EXPENSE', severity: 'warning', blocking: false }),
    ]))
  })
})
