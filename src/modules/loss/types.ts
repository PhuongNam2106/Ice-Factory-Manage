export type LossClassification = 'matched' | 'loss' | 'surplus' | 'no_production'

export interface DailyLossCalculationInput {
  openingBags: number
  producedBags: number
  soldBags: number
  closingBags: number
  warningPct: number
}

export interface DailyLossCalculation {
  differenceBags: number
  differencePct: string | null
  classification: LossClassification
  requiresReview: boolean
}

export type DailyLossReport = {
  id: string | null
  operatingDay: string
  openingBags: number | null
  producedBags: number
  soldBags: number
  expectedClosingBags: number | null
  closingBags: number | null
  differenceBags: number | null
  differencePct: string | null
  classification: LossClassification | null
  warningPct: string
  requiresReview: boolean
  warningConfirmedAt: string | null
  version: number | null
  isStale: boolean
  pendingHarvestCount: number
  previousDayReady: boolean
  canFinalize: boolean
  status: 'open' | 'locked'
  note: string | null
}

export type DailyLossHistoryItem = {
  id: string
  operatingDay: string
  openingBags: number
  producedBags: number
  soldBags: number
  closingBags: number
  differenceBags: number
  differencePct: string | null
  classification: LossClassification
  requiresReview: boolean
  warningConfirmedAt: string | null
  version: number
  updatedAt: string
}

export type DailyLossVersionItem = {
  version: number
  snapshot: import('@/lib/supabase/database.types').Json
  createdAt: string
  editorName: string
}
