import type { CreateRetailSale, CreateSale, CreateWholesaleSale } from './schema'

export type { CreateRetailSale, CreateSale, CreateWholesaleSale }

export type SaleListItem = {
  id: string
  kind: 'wholesale' | 'retail'
  operatingDay: string
  customerName: string | null
  shiftCode: string | null
  totalVnd: number
  paidNowVnd: number
  status: 'active' | 'cancelled'
  createdAt: string
}

export type CreateSaleResult = { saleId: string }
