import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

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
