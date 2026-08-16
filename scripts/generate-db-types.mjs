import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function normalizeGeneratedTypes(value) {
  return `${value.replace(/\r\n/g, '\n').trimEnd()}\n`
}

export function generateDatabaseTypes() {
  const cli = resolve('node_modules/supabase/dist/supabase.js')
  const result = spawnSync(process.execPath, [cli, 'gen', 'types', 'typescript', '--local'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`supabase gen types thất bại với mã ${result.status}.`)
  writeFileSync('src/lib/supabase/database.types.ts', normalizeGeneratedTypes(result.stdout), 'utf8')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    generateDatabaseTypes()
    console.log('[db:types] Đã tạo database.types.ts ổn định trên Windows/Linux.')
  } catch (error) {
    console.error(`[db:types] Không đạt: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`)
    process.exitCode = 1
  }
}
