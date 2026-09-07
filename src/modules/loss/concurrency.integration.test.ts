import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database, Json } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function addDays(day: string, amount: number) {
  const value = new Date(`${day}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

describe('daily loss concurrent saves', () => {
  if (!canRun) {
    it.skip('requires an isolated local Supabase database', () => {})
    return
  }

  it('returns one idempotent result and rejects one competing version update', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const managerId = '22222222-2222-2222-2222-222222222222'
    const suffix = Number(String(Date.now()).slice(-4))
    const day = `2177-${String((suffix % 10) + 1).padStart(2, '0')}-${String((suffix % 20) + 1).padStart(2, '0')}`
    const previousDay = addDays(day, -1)
    await adminClient.from('operating_days').insert([
      { day: previousDay, status: 'locked', locked_at: new Date().toISOString(), locked_by: managerId },
      { day, status: 'open' },
    ])
    await adminClient.from('daily_loss_reports').insert({
      operating_day: previousDay,
      opening_bags: 0,
      produced_bags: 0,
      sold_bags: 0,
      closing_bags: 0,
      difference_bags: 0,
      difference_pct: null,
      classification: 'no_production',
      warning_pct: 5,
      requires_review: false,
      source_snapshot: {} as Json,
      created_by: managerId,
      updated_by: managerId,
    })

    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    expect((await client.auth.signInWithPassword({
      email: usernameToAuthEmail('nhanvien'),
      password: process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD ?? '123456',
    })).error).toBeNull()

    const createKey = crypto.randomUUID()
    const createInput = { operatingDay: day, closingBags: 0 }
    const first = await client.rpc('save_daily_loss_report', {
      p_input: createInput,
      p_idempotency_key: createKey,
    })
    const repeated = await client.rpc('save_daily_loss_report', {
      p_input: createInput,
      p_idempotency_key: createKey,
    })
    expect(first.error).toBeNull()
    expect(repeated.data).toEqual(first.data)

    const [left, right] = await Promise.all([
      client.rpc('save_daily_loss_report', {
        p_input: { ...createInput, closingBags: 1, expectedVersion: 1 },
        p_idempotency_key: crypto.randomUUID(),
      }),
      client.rpc('save_daily_loss_report', {
        p_input: { ...createInput, closingBags: 2, expectedVersion: 1 },
        p_idempotency_key: crypto.randomUUID(),
      }),
    ])
    expect([left, right].filter((result) => result.error === null)).toHaveLength(1)
    expect([left, right].filter((result) => result.error?.message.includes('VERSION_CONFLICT'))).toHaveLength(1)
    await client.auth.signOut()
  }, 45_000)
})
