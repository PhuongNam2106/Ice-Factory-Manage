export type AlertCode =
  | 'STOCK_VARIANCE'
  | 'INSUFFICIENT_STOCK'
  | 'OVERDUE_DEBT'
  | 'PENDING_EXPENSE'
  | 'UNLOCKED_PREVIOUS_DAY'
  | 'OUTLIER_VALUE'

export interface OperationalAlert {
  code: AlertCode
  severity: 'info' | 'warning' | 'danger'
  message: string
  blocking: false
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
  openingStockBags: number
  stockBalanceBags: number
  stockExpectedBags: number | null
  stockActualBags: number | null
  stockVarianceBags: number | null
  stockVariancePct: number | null
  stockWarningPct: number
  approvedExpenseVnd: number
  pendingExpenseVnd: number
  pendingExpenseCount: number
  overdueDebtVnd: number
  productionMismatchCount: number
  previousDayUnlocked: boolean
}

export interface DailyDashboard extends DashboardRow {
  revenueVnd: number
  officialProfitVnd: number
  alerts: OperationalAlert[]
}
