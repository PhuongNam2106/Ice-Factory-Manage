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
