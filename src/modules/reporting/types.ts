export type AlertCode =
  | 'MISSING_LOSS_REPORT'
  | 'PENDING_HARVEST_QUANTITY'
  | 'LOSS_REPORT_STALE'
  | 'LOSS_REVIEW_REQUIRED'
  | 'LOSS_SURPLUS'
  | 'OVERDUE_DEBT'
  | 'PENDING_EXPENSE'
  | 'UNLOCKED_PREVIOUS_DAY'
  | 'OUTLIER_VALUE'

export interface OperationalAlert {
  code: AlertCode
  severity: 'info' | 'warning' | 'danger'
  message: string
  blocking: false
  href?: string
}

export interface DashboardRow {
  day: string
  status: 'open' | 'locked'
  wholesaleRevenueVnd: number
  retailRevenueVnd: number
  collectedVnd: number
  newDebtVnd: number
  totalDebtVnd: number
  productionBags: number
  soldBags: number
  openingBags: number | null
  expectedClosingBags: number | null
  closingBags: number | null
  differenceBags: number | null
  differencePct: number | null
  lossClassification: import('@/modules/loss/types').LossClassification | null
  lossRequiresReview: boolean
  lossReportStale: boolean
  lossReportExists: boolean
  lossWarningPct: number
  pendingHarvestCount: number
  approvedExpenseVnd: number
  pendingExpenseVnd: number
  pendingExpenseCount: number
  overdueDebtVnd: number
  previousDayUnlocked: boolean
}

export interface DailyDashboard extends DashboardRow {
  revenueVnd: number
  officialProfitVnd: number
  alerts: OperationalAlert[]
}
