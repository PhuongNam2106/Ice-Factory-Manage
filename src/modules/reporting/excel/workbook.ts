import ExcelJS from 'exceljs'
import { styleTitle } from './styles'

export type ReportMetadata = {
  exportedAt: Date
  exportedBy: string
  from: string
  to: string
  lockStatus: 'open' | 'locked' | 'mixed'
}

export class ReportReconciliationError extends Error {
  readonly code = 'REPORT_RECONCILIATION_FAILED'

  constructor(message = 'Số liệu báo cáo không khớp dữ liệu nguồn.') {
    super(message)
    this.name = 'ReportReconciliationError'
  }
}

export function assertReconciled(actual: number, expected: number, label: string) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || actual !== expected) {
    throw new ReportReconciliationError(`${label}: ${actual} không khớp ${expected}.`)
  }
}

export function createWorkbook(title: string, metadata: ReportMetadata) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quản lý xưởng nước đá'
  workbook.created = metadata.exportedAt
  workbook.modified = metadata.exportedAt
  workbook.properties.date1904 = false
  const sheet = workbook.addWorksheet('Tổng hợp')
  sheet.mergeCells('A1:B1')
  sheet.getCell('A1').value = title
  styleTitle(sheet.getCell('A1'))
  sheet.getRow(1).height = 26
  sheet.addRow(['Khoảng ngày', `${metadata.from} — ${metadata.to}`])
  sheet.addRow(['Người xuất', metadata.exportedBy])
  sheet.addRow(['Trạng thái khóa', metadata.lockStatus])
  return { workbook, sheet }
}

export async function serializeWorkbook(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const bytes = await workbook.xlsx.writeBuffer()
  return Buffer.from(bytes)
}
