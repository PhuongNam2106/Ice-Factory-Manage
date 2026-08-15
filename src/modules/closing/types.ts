export type ClosingCheckCode =
  | 'MISSING_STOCK_COUNT'
  | 'PENDING_EXPENSES'
  | 'UNNAMED_CREDIT_SALES'
  | 'INVALID_PRODUCTION_SOURCE'
  | 'INVALID_DOCUMENTS'
  | 'STOCK_VARIANCE'

export interface ClosingCheckInput {
  stockCountExists: boolean
  pendingExpenseCount: number
  unnamedCreditSaleCount: number
  invalidProductionSourceCount: number
  invalidDocumentCount: number
  stockVariancePct: number | null
  stockWarningPct: number
}

export interface ClosingCheck {
  code: ClosingCheckCode
  blocking: boolean
  overridable: boolean
  message: string
}

export interface DailyTotals {
  wholesaleRevenueVnd: number
  retailRevenueVnd: number
  revenueVnd: number
  soldBags: number
  collectedVnd: number
  newDebtVnd: number
  productionBags: number
  approvedExpenseVnd: number
  pendingExpenseVnd: number
  stockExpectedBags: number | null
  stockActualBags: number | null
  stockVarianceBags: number | null
  stockVariancePct: number | null
}

export interface DailyReconciliation {
  day: string
  status: 'open' | 'locked'
  snapshotVersion: number
  stockWarningPct: number
  totals: DailyTotals
  checks: ClosingCheck[]
  overrideReason?: string | null
}
