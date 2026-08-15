export type StockCountResult = {
  countId: string
  varianceBags: string
  variancePct: string | null
  requiresReview: boolean
}

export type InventoryLedgerItem = {
  id: string
  operatingDay: string
  kind: 'opening' | 'production' | 'sale' | 'adjustment' | 'reversal'
  quantityDeltaBags: number
  sourceType: string
  note: string | null
  createdAt: string
}

export type StockCountItem = {
  id: string
  operatingDay: string
  expectedBags: number
  actualBags: number
  varianceBags: number
  variancePct: number | null
  warningPct: number
  requiresReview: boolean
  note: string | null
  createdAt: string
}
