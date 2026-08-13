import type { RecordReceipt } from './schema'

export type { RecordReceipt }

export type ReceivableListItem = {
  id: string
  saleId: string
  customerId: string
  customerName: string
  operatingDay: string
  originalAmountVnd: number
  outstandingAmountVnd: number
  dueDate: string
  status: 'open' | 'paid' | 'cancelled'
  createdAt: string
}

export type CustomerDebtSummary = {
  customerId: string
  customerName: string
  customerPhone: string | null
  totalOutstandingVnd: number
  overdueVnd: number
  oldestDueDate: string | null
  openReceivablesCount: number
}

export type ReceiptListItem = {
  id: string
  customerId: string | null
  customerName: string | null
  operatingDay: string
  amountVnd: number
  paymentMethod: 'cash' | 'bank_transfer'
  note: string | null
  createdAt: string
}

export type RecordReceiptResult = { receiptId: string }
