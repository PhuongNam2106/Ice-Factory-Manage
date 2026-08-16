export const backupSchemaVersion = 1

export type BackupTable = { name: string; rows: Array<Record<string, unknown>> }

function csvValue(value: unknown) {
  if (value == null) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  if (!columns.length) return ''
  return [columns.map(csvValue).join(','), ...rows.map((row) => columns.map((key) => csvValue(row[key])).join(','))].join('\r\n')
}

export function buildBackupExport(tables: BackupTable[], exportedAt = new Date()) {
  return {
    schemaVersion: backupSchemaVersion,
    exportedAt: exportedAt.toISOString(),
    tables: Object.fromEntries(tables.map((table) => [table.name, table.rows])),
    csv: Object.fromEntries(tables.map((table) => [table.name, rowsToCsv(table.rows)])),
  }
}
