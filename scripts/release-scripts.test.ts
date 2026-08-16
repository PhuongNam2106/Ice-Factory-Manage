import { describe, expect, it } from 'vitest'
// @ts-expect-error Node release scripts are intentionally plain ESM.
import { validateEnvironment } from './verify-env.mjs'
// @ts-expect-error Node release scripts are intentionally plain ESM.
import { normalizeTargetUrl } from './smoke-production.mjs'
// @ts-expect-error Node release scripts are intentionally plain ESM.
import { normalizeGeneratedTypes } from './generate-db-types.mjs'

describe('release scripts', () => {
  it('rejects missing secrets and insecure production URLs without exposing values', () => {
    const result = validateEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: 'http://example.com',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
      APP_TIME_ZONE: 'Asia/Bangkok',
    }, { production: true })
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY'),
      expect.stringContaining('HTTPS'),
    ]))
    expect(JSON.stringify(result)).not.toContain('public-key')
  })

  it('accepts the complete production contract', () => {
    expect(validateEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
      APP_TIME_ZONE: 'Asia/Bangkok',
    }, { production: true })).toEqual({ ok: true, errors: [] })
  })

  it('normalizes only HTTP(S) smoke targets', () => {
    expect(normalizeTargetUrl('https://preview.example.com/')).toBe('https://preview.example.com')
    expect(() => normalizeTargetUrl('file:///tmp/app')).toThrow('HTTP')
  })

  it('keeps exactly one newline in generated database types', () => {
    expect(normalizeGeneratedTypes('export type Database = {}\r\n\r\n')).toBe('export type Database = {}\n')
  })
})
