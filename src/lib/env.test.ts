import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseEnv, parsePublicEnv } from './env'

describe('parseEnv', () => {
  it('rejects a missing service role key', () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
        APP_TIME_ZONE: 'Asia/Bangkok',
      }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY')
  })
})

describe('parsePublicEnv', () => {
  it('does not require the server-only service role key', () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
        APP_TIME_ZONE: 'Asia/Bangkok',
      }),
    ).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
    })
  })

  it('keeps browser env references statically analyzable for the Next.js client compiler', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/lib/env.ts'), 'utf8')

    expect(source).toMatch(
      /parsePublicEnv\(\{\s*NEXT_PUBLIC_SUPABASE_URL:\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL,\s*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:\s*process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,/,
    )
  })
})

describe('audit integration environment gate', () => {
  it('does not run the admin-client assertion without every dependency required by getEnv', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/modules/audit/audit.integration.test.ts'),
      'utf8',
    )

    expect(source).toContain('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  })
})
