import ExcelJS from 'exceljs'
import type { ReportMetadata } from './workbook'
import { assertReconciled, serializeWorkbook } from './workbook'
import { currencyFormat, dateFormat, finishSheet, quantityFormat, styleHeader, styleTitle } from './styles'

export type DetailCell = string | number | boolean | Date | null
export type DetailColumn = {
  key: string
  label: string
  kind?: 'text' | 'currency' | 'quantity' | 'date'
}

export type DetailReportInput = {
  title: string
  sheetName: string
  metadata: ReportMetadata
  columns: DetailColumn[]
  rows: Array<Record<string, DetailCell>>
  reconciliation?: { key: string; expected: number; label: string }
}

export async function buildDetailWorkbook(input: DetailReportInput): Promise<Buffer> {
  if (input.reconciliation) {
    const actual = input.rows.reduce((sum, row) => sum + Number(row[input.reconciliation!.key] ?? 0), 0)
    assertReconciled(actual, input.reconciliation.expected, input.reconciliation.label)
  }
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quản lý xưởng nước đá'
  workbook.created = input.metadata.exportedAt
  const sheet = workbook.addWorksheet(input.sheetName.slice(0, 31))
  sheet.mergeCells(1, 1, 1, input.columns.length)
  sheet.getCell(1, 1).value = input.title
  styleTitle(sheet.getCell(1, 1))
  sheet.addRow([`Từ ${input.metadata.from} đến ${input.metadata.to}`])
  sheet.addRow([`Người xuất: ${input.metadata.exportedBy}`])
  sheet.addRow(input.columns.map((column) => column.label))
  styleHeader(sheet.getRow(4))
  for (const source of input.rows) {
    const row = sheet.addRow(input.columns.map((column) => source[column.key]))
    input.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1)
      if (column.kind === 'currency') cell.numFmt = currencyFormat
      if (column.kind === 'quantity') cell.numFmt = quantityFormat
      if (column.kind === 'date') cell.numFmt = dateFormat
    })
  }
  finishSheet(sheet, 4)
  return serializeWorkbook(workbook)
}
