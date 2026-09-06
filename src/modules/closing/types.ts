export type ClosingCheckCode =
  | 'MISSING_LOSS_REPORT'
  | 'PREVIOUS_DAY_NOT_READY'
  | 'PENDING_HARVEST_QUANTITY'
  | 'LOSS_REPORT_STALE'
  | 'LOSS_REVIEW_REQUIRED'
  | 'OPEN_MACHINE_RUNS'
  | 'PENDING_EXPENSES'
  | 'UNNAMED_CREDIT_SALES'
  | 'INVALID_DOCUMENTS'

export interface ClosingCheckInput {
  lossReportExists: boolean
  previousDayReady: boolean
  pendingHarvestCount: number
  lossReportStale: boolean
  lossRequiresReview: boolean
  lossWarningConfirmed: boolean
  openMachineRunCount?: number
  pendingExpenseCount: number
  unnamedCreditSaleCount: number
  invalidDocumentCount: number
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
  openingBags: number | null
  expectedClosingBags: number | null
  closingBags: number | null
  differenceBags: number | null
  differencePct: number | null
}

export interface DailyReconciliation {
  day: string
  status: 'open' | 'locked'
  snapshotVersion: number
  lossWarningPct: number
  lossReportId: string | null
  lossReportVersion: number | null
  totals: DailyTotals
  checks: ClosingCheck[]
  overrideReason?: string | null
}
