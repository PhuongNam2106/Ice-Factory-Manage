import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { ReportReconciliationError } from './workbook'
import { buildDailyWorkbook, type DailyReportInput } from './daily-report'
import { buildBackupExport } from './backup-export'
import { buildMonthlyWorkbook } from './monthly-report'

function reportFixture(overrides: Partial<DailyReportInput['summary']> = {}): DailyReportInput {
  return {
    metadata: {
      exportedAt: new Date('2026-08-16T01:30:00.000Z'),
      exportedBy: 'Quản lý xưởng',
      from: '2026-08-15',
      to: '2026-08-15',
      lockStatus: 'locked',
    },
    summary: {
      wholesaleVnd: 700_000,
      retailVnd: 300_000,
      approvedExpenseVnd: 200_000,
      productionBags: 120,
      soldBags: 100,
      collectedVnd: 800_000,
      totalDebtVnd: 110_000,
      ...overrides,
    },
  }
}

describe('Excel report reconciliation', () => {
  it('writes the same revenue total as the dashboard query', async () => {
    const buffer = await buildDailyWorkbook(reportFixture())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

    expect(workbook.getWorksheet('Tổng hợp')?.getCell('B5').value).toBe(1_000_000)
    expect(workbook.getWorksheet('Tổng hợp')?.getCell('B11').value).toBe(110_000)
  })

  it('returns no workbook when the declared revenue does not reconcile', async () => {
    const source = reportFixture()
    source.expectedRevenueVnd = 999_999

    await expect(buildDailyWorkbook(source)).rejects.toBeInstanceOf(ReportReconciliationError)
  })

  it('separates locked and open revenue in the monthly workbook', async () => {
    const metadata = reportFixture().metadata
    const buffer = await buildMonthlyWorkbook({ metadata: { ...metadata, lockStatus: 'mixed' }, days: [
      { day: '2026-08-14', status: 'locked', wholesaleVnd: 700_000, retailVnd: 0, approvedExpenseVnd: 0, productionBags: 10, soldBags: 8 },
      { day: '2026-08-15', status: 'open', wholesaleVnd: 0, retailVnd: 300_000, approvedExpenseVnd: 0, productionBags: 5, soldBags: 4 },
    ] })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

    expect(workbook.getWorksheet('Tổng hợp')?.getCell('B6').value).toBe(700_000)
    expect(workbook.getWorksheet('Tổng hợp')?.getCell('B7').value).toBe(300_000)
  })

  it('includes versioned JSON data and CSV copies in a backup', () => {
    const backup = buildBackupExport([{ name: 'sales', rows: [{ id: 'sale-1', total_vnd: 125_000 }] }], new Date('2026-08-16T00:00:00Z'))

    expect(backup).toMatchObject({ schemaVersion: 1, exportedAt: '2026-08-16T00:00:00.000Z' })
    expect(backup.tables.sales).toEqual([{ id: 'sale-1', total_vnd: 125_000 }])
    expect(backup.csv.sales).toContain('"sale-1","125000"')
  })
})
