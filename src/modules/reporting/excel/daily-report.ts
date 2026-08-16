import type { ReportMetadata } from './workbook'
import { assertReconciled, createWorkbook, serializeWorkbook } from './workbook'
import { currencyFormat, quantityFormat } from './styles'

export type DailyReportInput = {
  metadata: ReportMetadata
  summary: {
    wholesaleVnd: number
    retailVnd: number
    approvedExpenseVnd: number
    productionBags: number
    soldBags: number
    collectedVnd: number
  }
  expectedRevenueVnd?: number
}

export async function buildDailyWorkbook(input: DailyReportInput): Promise<Buffer> {
  const revenueVnd = input.summary.wholesaleVnd + input.summary.retailVnd
  assertReconciled(revenueVnd, input.expectedRevenueVnd ?? revenueVnd, 'Doanh thu')
  const { workbook, sheet } = createWorkbook('BÁO CÁO VẬN HÀNH NGÀY', input.metadata)
  const rows: Array<[string, number, string]> = [
    ['Tổng doanh thu', revenueVnd, currencyFormat],
    ['Doanh thu sỉ', input.summary.wholesaleVnd, currencyFormat],
    ['Doanh thu lẻ', input.summary.retailVnd, currencyFormat],
    ['Đã thu', input.summary.collectedVnd, currencyFormat],
    ['Chi phí đã duyệt', input.summary.approvedExpenseVnd, currencyFormat],
    ['Lợi nhuận tạm tính', revenueVnd - input.summary.approvedExpenseVnd, currencyFormat],
    ['Sản xuất', input.summary.productionBags, quantityFormat],
    ['Đã bán', input.summary.soldBags, quantityFormat],
  ]
  rows.forEach(([label, value, format]) => {
    const row = sheet.addRow([label, value])
    row.getCell(2).numFmt = format
  })
  sheet.columns = [{ width: 28 }, { width: 22 }]
  return serializeWorkbook(workbook)
}
