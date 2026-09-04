import type { OperationalAlert } from './types'

export function detectOutlier(current: number, previous: number[]): boolean {
  const values = previous.filter(Number.isFinite).slice(0, 30).toSorted((a, b) => a - b)
  if (!values.length) return false
  const middle = Math.floor(values.length / 2)
  const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
  return median > 0 && (current > median * 2 || current < median * 0.5)
}

export function getOperationalAlerts(input: {
  stockVariancePct: number | null
  stockWarningPct: number
  stockBalanceBags: number
  overdueDebtVnd: number
  pendingExpenseCount: number
  productionMismatchCount: number
  previousDayUnlocked: boolean
  hasOutlier: boolean
}): OperationalAlert[] {
  const alerts: OperationalAlert[] = []
  if (input.stockVariancePct === null || input.stockVariancePct > input.stockWarningPct) alerts.push({ code: 'STOCK_VARIANCE', severity: 'danger', message: 'Chênh lệch tồn vượt ngưỡng cảnh báo.', blocking: false })
  if (input.stockBalanceBags < 0) alerts.push({ code: 'INSUFFICIENT_STOCK', severity: 'danger', message: 'Tồn kho đang âm.', blocking: false })
  if (input.overdueDebtVnd > 0) alerts.push({ code: 'OVERDUE_DEBT', severity: 'warning', message: `Có ${input.overdueDebtVnd.toLocaleString('vi-VN')} đ công nợ quá hạn.`, blocking: false })
  if (input.pendingExpenseCount > 0) alerts.push({ code: 'PENDING_EXPENSE', severity: 'warning', message: `${input.pendingExpenseCount} khoản chi đang chờ duyệt.`, blocking: false })
  if (input.previousDayUnlocked) alerts.push({ code: 'UNLOCKED_PREVIOUS_DAY', severity: 'warning', message: 'Ngày vận hành trước đó chưa khóa sổ.', blocking: false })
  if (input.hasOutlier) alerts.push({ code: 'OUTLIER_VALUE', severity: 'info', message: 'Có số lượng hoặc đơn giá khác thường so với 30 giao dịch gần nhất.', blocking: false })
  return alerts
}
