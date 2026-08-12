import { describe, expect, it } from 'vitest'

const hasServiceRoleCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

describe('audit_log', () => {
  if (!hasServiceRoleCredentials) {
    it.skip(
      'requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY; remote SQL verification records the append-only trigger result',
      () => {},
    )
  } else {
    it('rejects direct deletion', async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const { error } = await adminClient.from('audit_log').delete().neq('id', '')
      expect(error?.message).toContain('audit_log is append-only')
    })
  }
})
