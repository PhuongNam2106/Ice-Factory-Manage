import type ExcelJS from 'exceljs'

export const currencyFormat = '#,##0 "đ"'
export const quantityFormat = '#,##0.###'
export const dateFormat = 'dd/mm/yyyy'

export function styleTitle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075985' } }
  cell.alignment = { vertical: 'middle' }
}

export function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  row.alignment = { vertical: 'middle', wrapText: true }
}

export function finishSheet(sheet: ExcelJS.Worksheet, headerRow = 1) {
  sheet.views = [{ state: 'frozen', ySplit: headerRow }]
  if (sheet.columnCount > 0 && sheet.rowCount >= headerRow) {
    sheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: sheet.rowCount, column: sheet.columnCount },
    }
  }
  sheet.columns.forEach((column) => {
    let max = 10
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      max = Math.max(max, String(cell.value ?? '').length + 2)
    })
    column.width = Math.min(max, 40)
  })
}
