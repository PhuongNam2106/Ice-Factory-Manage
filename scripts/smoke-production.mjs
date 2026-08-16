import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function normalizeTargetUrl(value) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Địa chỉ smoke phải dùng HTTP hoặc HTTPS.')
  return url.href.replace(/\/$/, '')
}

async function expectResponse(url, { contentType, contains } = {}) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`${new URL(url).pathname} trả HTTP ${response.status}.`)
  if (contentType && !response.headers.get('content-type')?.includes(contentType)) {
    throw new Error(`${new URL(url).pathname} trả content-type không đúng.`)
  }
  const body = await response.text()
  if (contains && !body.includes(contains)) throw new Error(`${new URL(url).pathname} thiếu nội dung mong đợi.`)
  return response
}

async function checkDeployedBackend(baseUrl, env) {
  const required = ['SMOKE_USERNAME', 'SMOKE_PASSWORD']
  const missing = required.filter((name) => !env[name]?.trim())
  if (missing.length) throw new Error(`Thiếu biến smoke: ${missing.join(', ')}.`)

  const health = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: env.SMOKE_USERNAME, password: env.SMOKE_PASSWORD }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!health.ok) throw new Error(`Health endpoint của deployment thất bại (HTTP ${health.status}).`)
  const result = await health.json()
  if (result.ok !== true || typeof result.backendHost !== 'string') throw new Error('Deployment không xác nhận được backend Supabase.')
}

export async function runSmoke(target, env = process.env) {
  const baseUrl = normalizeTargetUrl(target)
  const parsed = new URL(baseUrl)
  if (parsed.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('Preview/production phải dùng HTTPS.')
  }
  await expectResponse(`${baseUrl}/login`, { contentType: 'text/html', contains: 'Đăng Nhập' })
  await expectResponse(`${baseUrl}/manifest.webmanifest`, { contains: 'Quản lý xưởng nước đá' })
  await expectResponse(`${baseUrl}/serwist/sw.js`, { contentType: 'javascript' })
  await checkDeployedBackend(baseUrl, env)
  console.log('[smoke] OK: HTTPS/login, manifest, service worker và backend có xác thực của deployment đều hoạt động.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local')
  const target = process.argv[2]
  if (!target) {
    console.error('Cách dùng: node scripts/smoke-production.mjs <preview-url>')
    process.exitCode = 1
  } else {
    runSmoke(target).catch((error) => {
      console.error(`[smoke] Không đạt: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`)
      process.exitCode = 1
    })
  }
}
