import { describe, expect, it } from 'vitest'
import { ensureOperatingDay } from './ensure-day'

const hasServiceRoleCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

describe('ensureOperatingDay', () => {
  if (!hasServiceRoleCredentials) {
    it.skip(
      'requires Supabase service-role credentials; remote SQL verification proves concurrent creation produces one row',
      () => {},
    )
  } else {
    it('creates exactly one row for two concurrent calls', async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const day = `2199-12-${String((Date.now() % 27) + 1).padStart(2, '0')}`

      await adminClient.from('operating_days').delete().eq('day', day)
      try {
        await Promise.all([
          ensureOperatingDay(day, adminClient),
          ensureOperatingDay(day, adminClient),
        ])

        const { data, error } = await adminClient
          .from('operating_days')
          .select('day, status')
          .eq('day', day)

        expect(error).toBeNull()
        expect(data).toEqual([{ day, status: 'open' }])

      } finally {
        await adminClient.from('operating_days').delete().eq('day', day)
      }
    })
  }
})
