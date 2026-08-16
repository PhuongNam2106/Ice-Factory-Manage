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
  ;[
    ['Tổng doanh thu', revenueVnd],
    ['Doanh thu ngày đã khóa', lockedRevenue],
    ['Doanh thu ngày đang mở', openRevenue],
    ['Chi phí đã duyệt', input.days.reduce((sum, day) => sum + day.approvedExpenseVnd, 0)],
  ].forEach(([label, value]) => {
    const row = summary.addRow([label, value])
    row.getCell(2).numFmt = currencyFormat
  })
  summary.columns = [{ width: 30 }, { width: 22 }]

  const detail = workbook.addWorksheet('Theo ngày')
  detail.addRow(['Ngày', 'Trạng thái', 'Doanh thu sỉ', 'Doanh thu lẻ', 'Chi phí duyệt', 'Sản xuất', 'Đã bán'])
  styleHeader(detail.getRow(1))
  input.days.forEach((day) => {
    const row = detail.addRow([
      new Date(`${day.day}T12:00:00+07:00`), day.status, day.wholesaleVnd, day.retailVnd,
      day.approvedExpenseVnd, day.productionBags, day.soldBags,
    ])
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    for (const column of [3, 4, 5]) row.getCell(column).numFmt = currencyFormat
    for (const column of [6, 7]) row.getCell(column).numFmt = quantityFormat
  })
  finishSheet(detail)
  return serializeWorkbook(workbook)
}
