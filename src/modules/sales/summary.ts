import type { SaleListItem } from './types'

export type SalesDaySummaryData = {
  totalTransactions: number
  activeTransactions: number
  cancelledTransactions: number
  wholesaleRevenueVnd: number
  retailRevenueVnd: number
  totalRevenueVnd: number
}

export function summarizeSales(sales: SaleListItem[]): SalesDaySummaryData {
  return sales.reduce(
    (summary, sale) => {
      summary.totalTransactions += 1

      if (sale.status === 'cancelled') {
        summary.cancelledTransactions += 1
        return summary
      }

      summary.activeTransactions += 1
      summary.totalRevenueVnd += sale.totalVnd

      if (sale.kind === 'wholesale') {
        summary.wholesaleRevenueVnd += sale.totalVnd
      } else {
        summary.retailRevenueVnd += sale.totalVnd
      }

      return summary
    },
    {
      totalTransactions: 0,
      activeTransactions: 0,
      cancelledTransactions: 0,
      wholesaleRevenueVnd: 0,
      retailRevenueVnd: 0,
      totalRevenueVnd: 0,
    },
  )
}
