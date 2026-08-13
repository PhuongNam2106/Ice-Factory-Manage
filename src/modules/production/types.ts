import type {
  ProductionBatch,
  ProductionShiftTotal,
  SelectProductionSource,
} from './schema'

export type { ProductionBatch, ProductionShiftTotal, SelectProductionSource }

export type ProductionShiftCode = 'ca_sang' | 'ca_chieu' | 'ca_dem'
export type ProductionSourceKind = 'batches' | 'shift_total'

export type ProductionBatchResult = { batchId: string }
export type ProductionShiftTotalResult = { shiftTotalId: string }
export type ProductionSourceSelectionResult = { selectionId: string }

export type ProductionBatchItem = {
  id: string
  operatingDay: string
  shiftCode: ProductionShiftCode
  machineId: string
  machineName: string
  startTime: string
  endTime: string
  goodBags: number
  rejectedBags: number
  note: string | null
  createdAt: string
}

export type ProductionShiftTotalItem = {
  id: string
  operatingDay: string
  shiftCode: ProductionShiftCode
  machineId: string
  machineName: string
  goodBags: number
  rejectedBags: number
  note: string | null
  createdAt: string
}

export type ProductionReconciliationSummary = {
  operatingDay: string
  shiftCode: ProductionShiftCode
  machineId: string
  machineName: string
  batchGoodBags: number
  shiftGoodBags: number | null
  selectedSource: ProductionSourceKind
  isConfirmed: boolean
  diffBags: string
  pct: string | null
  hasDiscrepancy: boolean
  officialQuantityBags: number
}
