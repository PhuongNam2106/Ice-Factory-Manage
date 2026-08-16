import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

export function validateEnvironment(env, { production = false } = {}) {
  const errors = []
  for (const name of required) {
    if (!env[name]?.trim()) errors.push(`${name} chưa được cấu hình.`)
  }

  let url
  try {
    url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  } catch {
    errors.push('NEXT_PUBLIC_SUPABASE_URL không phải URL hợp lệ.')
  }
  if (production && url?.protocol !== 'https:') {
    errors.push('NEXT_PUBLIC_SUPABASE_URL phải dùng HTTPS ở production.')
  }
  if ((env.APP_TIME_ZONE || 'Asia/Bangkok') !== 'Asia/Bangkok') {
    errors.push('APP_TIME_ZONE phải là Asia/Bangkok.')
  }
  if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('Không được khai báo NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.')
  }
  if (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    errors.push('Publishable key và service-role key không được giống nhau.')
  }
  return { ok: errors.length === 0, errors }
}

export function runVerifyEnv(env = process.env, options = {}) {
  const result = validateEnvironment(env, options)
  if (!result.ok) {
    console.error('[verify-env] Không đạt:')
    for (const error of result.errors) console.error(`- ${error}`)
    return 1
  }
  console.log('[verify-env] OK: đủ biến bắt buộc, timezone hợp lệ và không lộ service-role key ra public.')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  process.exitCode = runVerifyEnv(process.env, {
    production: process.argv.includes('--production') || process.env.NODE_ENV === 'production',
  })
}
