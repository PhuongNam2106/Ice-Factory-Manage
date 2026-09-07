import type { ReportMetadata } from './workbook'
import { assertReconciled, createWorkbook, serializeWorkbook } from './workbook'
import { currencyFormat, finishSheet, quantityFormat, styleHeader } from './styles'

export type MonthlyReportDay = {
  day: string
  status: 'open' | 'locked'
  wholesaleVnd: number
  retailVnd: number
  approvedExpenseVnd: number
  productionBags: number
  soldBags: number
  differenceBags: number | null
  differencePct: number | null
}

export type MonthlyReportInput = {
  metadata: ReportMetadata
  days: MonthlyReportDay[]
  expectedRevenueVnd?: number
}

export async function buildMonthlyWorkbook(input: MonthlyReportInput): Promise<Buffer> {
  const revenueVnd = input.days.reduce((sum, day) => sum + day.wholesaleVnd + day.retailVnd, 0)
  assertReconciled(revenueVnd, input.expectedRevenueVnd ?? revenueVnd, 'Doanh thu tháng')
  const { workbook, sheet: summary } = createWorkbook('BÁO CÁO VẬN HÀNH THÁNG', input.metadata)
  const lockedRevenue = input.days.filter((day) => day.status === 'locked')
    .reduce((sum, day) => sum + day.wholesaleVnd + day.retailVnd, 0)
  const openRevenue = revenueVnd - lockedRevenue
  const productionBags = input.days.reduce((sum, day) => sum + day.productionBags, 0)
  const soldBags = input.days.reduce((sum, day) => sum + day.soldBags, 0)
  const lossBags = input.days.reduce((sum, day) => sum + Math.max(day.differenceBags ?? 0, 0), 0)
  const absoluteDifferenceBags = input.days.reduce((sum, day) => sum + Math.abs(day.differenceBags ?? 0), 0)
  const aggregateRate = productionBags === 0 ? null : absoluteDifferenceBags / productionBags * 100
  const summaryRows: Array<[string, number | null]> = [
    ['Tổng doanh thu', revenueVnd],
    ['Doanh thu ngày đã khóa', lockedRevenue],
    ['Doanh thu ngày đang mở', openRevenue],
    ['Chi phí đã duyệt', input.days.reduce((sum, day) => sum + day.approvedExpenseVnd, 0)],
    ['Tổng sản xuất', productionBags],
    ['Tổng đã bán', soldBags],
    ['Tổng hao hụt', lossBags],
    ['Tỷ lệ chênh lệch tổng hợp', aggregateRate],
  ]
  summaryRows.forEach(([label, value]) => {
    const row = summary.addRow([label, value])
    row.getCell(2).numFmt = label === 'Tỷ lệ chênh lệch tổng hợp'
      ? '0.000"%"'
      : label.startsWith('Tổng s') || label === 'Tổng đã bán' || label === 'Tổng hao hụt'
        ? quantityFormat
        : currencyFormat
  })
  summary.columns = [{ width: 30 }, { width: 22 }]

  const detail = workbook.addWorksheet('Theo ngày')
  detail.addRow(['Ngày', 'Trạng thái', 'Doanh thu sỉ', 'Doanh thu lẻ', 'Chi phí duyệt', 'Sản xuất', 'Đã bán', 'Chênh lệch', 'Tỷ lệ (%)'])
  styleHeader(detail.getRow(1))
  input.days.forEach((day) => {
    const row = detail.addRow([
      new Date(`${day.day}T12:00:00+07:00`), day.status, day.wholesaleVnd, day.retailVnd,
      day.approvedExpenseVnd, day.productionBags, day.soldBags, day.differenceBags, day.differencePct,
    ])
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    for (const column of [3, 4, 5]) row.getCell(column).numFmt = currencyFormat
    for (const column of [6, 7, 8]) row.getCell(column).numFmt = quantityFormat
    row.getCell(9).numFmt = '0.000"%"'
  })
  finishSheet(detail)
  return serializeWorkbook(workbook)
}
