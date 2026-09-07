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
      lossReportExists: true,
      pendingHarvestCount: 0,
      lossReportStale: false,
      lossRequiresReview: false,
      lossDifferenceBags: 0,
      lossDifferencePct: '0.000',
      lossWarningPct: 5,
      overdueDebtVnd: 200_000,
      pendingExpenseCount: 2,
      previousDayUnlocked: false,
      hasOutlier: false,
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'OVERDUE_DEBT', severity: 'warning', blocking: false }),
      expect.objectContaining({ code: 'PENDING_EXPENSE', severity: 'warning', blocking: false }),
    ]))
  })

  it('describes missing, pending, stale and over-threshold loss states', () => {
    const alerts = getOperationalAlerts({
      lossReportExists: false,
      pendingHarvestCount: 1,
      lossReportStale: true,
      lossRequiresReview: true,
      lossDifferenceBags: -5,
      lossDifferencePct: '6.000',
      lossWarningPct: 5,
      overdueDebtVnd: 0,
      pendingExpenseCount: 0,
      previousDayUnlocked: false,
      hasOutlier: false,
    })
    expect(alerts.map((alert) => alert.message)).toEqual(expect.arrayContaining([
      'Chưa nhập tồn cuối ngày.',
      'Còn lần xả đá chưa nhập số bao.',
      'Số liệu hao hụt đã thay đổi; cần kiểm tra và lưu lại.',
      'Hao hụt hoặc dư kho vượt ngưỡng 5%.',
      'Dư kho 5 bao.',
    ]))
  })
})
