import type { OperationalAlert } from './types'

export function detectOutlier(current: number, previous: number[]): boolean {
  const values = previous.filter(Number.isFinite).slice(0, 30).toSorted((a, b) => a - b)
  if (!values.length) return false
  const middle = Math.floor(values.length / 2)
  const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
  return median > 0 && (current > median * 2 || current < median * 0.5)
}

export function getOperationalAlerts(input: {
  lossReportExists: boolean
  pendingHarvestCount: number
  lossReportStale: boolean
  lossRequiresReview: boolean
  lossDifferenceBags: number | null
  lossDifferencePct: string | number | null
  lossWarningPct: number
  overdueDebtVnd: number
  pendingExpenseCount: number
  previousDayUnlocked: boolean
  hasOutlier: boolean
}): OperationalAlert[] {
  const alerts: OperationalAlert[] = []
  if (!input.lossReportExists) alerts.push({ code: 'MISSING_LOSS_REPORT', severity: 'danger', message: 'Chưa nhập tồn cuối ngày.', blocking: false, href: '/loss' })
  if (input.pendingHarvestCount > 0) alerts.push({ code: 'PENDING_HARVEST_QUANTITY', severity: 'danger', message: 'Còn lần xả đá chưa nhập số bao.', blocking: false, href: '/loss' })
  if (input.lossReportStale) alerts.push({ code: 'LOSS_REPORT_STALE', severity: 'danger', message: 'Số liệu hao hụt đã thay đổi; cần kiểm tra và lưu lại.', blocking: false, href: '/loss' })
  if (input.lossRequiresReview) alerts.push({ code: 'LOSS_REVIEW_REQUIRED', severity: 'danger', message: `Hao hụt hoặc dư kho vượt ngưỡng ${input.lossWarningPct.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%.`, blocking: false, href: '/loss' })
  if (input.lossDifferenceBags != null && input.lossDifferenceBags < 0) alerts.push({ code: 'LOSS_SURPLUS', severity: 'warning', message: `Dư kho ${Math.abs(input.lossDifferenceBags).toLocaleString('vi-VN')} bao.`, blocking: false, href: '/loss' })
  if (input.overdueDebtVnd > 0) alerts.push({ code: 'OVERDUE_DEBT', severity: 'warning', message: `Có ${input.overdueDebtVnd.toLocaleString('vi-VN')} đ công nợ quá hạn.`, blocking: false })
  if (input.pendingExpenseCount > 0) alerts.push({ code: 'PENDING_EXPENSE', severity: 'warning', message: `${input.pendingExpenseCount} khoản chi đang chờ duyệt.`, blocking: false })
  if (input.previousDayUnlocked) alerts.push({ code: 'UNLOCKED_PREVIOUS_DAY', severity: 'warning', message: 'Ngày vận hành trước đó chưa khóa sổ.', blocking: false })
  if (input.hasOutlier) alerts.push({ code: 'OUTLIER_VALUE', severity: 'info', message: 'Có số lượng hoặc đơn giá khác thường so với 30 giao dịch gần nhất.', blocking: false })
  return alerts
}
