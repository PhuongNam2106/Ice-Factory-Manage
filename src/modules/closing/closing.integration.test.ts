import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalUrl(url?: string) {
  if (!url) return false
  try { return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname) } catch { return false }
}

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' && isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('daily closing integration', () => {
  if (!canRun) { it.skip('requires an isolated local Supabase reset', () => {}); return }

  it('locks all write RPCs, reopens with a reason, and creates a new snapshot version', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    )
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
    expect((await client.auth.signInWithPassword({ email: usernameToAuthEmail('quanly'), password })).error).toBeNull()
    const day = `2194-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`

    try {
      await adminClient.from('operating_days').upsert({ day }, { onConflict: 'day' })
      const { data: balanceRows } = await adminClient.from('inventory_ledger').select('quantity_delta_bags')
      const balance = balanceRows!.reduce((sum, row) => sum + Number(row.quantity_delta_bags), 0)
      expect((await client.rpc('record_stock_count', {
        p_input: { operatingDay: day, actualBags: balance },
        p_idempotency_key: crypto.randomUUID(),
      })).error).toBeNull()

      const firstLock = await client.rpc('lock_operating_day', { p_day: day })
      expect(firstLock.error).toBeNull()
      expect((firstLock.data as { snapshotVersion: number }).snapshotVersion).toBe(1)

      const { data: customer } = await adminClient.from('customers').select('id').limit(1).single()
      const { data: machine } = await adminClient.from('machines').select('id').limit(1).single()
      const { data: category } = await adminClient.from('expense_categories').select('id').limit(1).single()
      const attempts = await Promise.all([
        client.rpc('create_sale', {
          p_input: { kind: 'retail', operatingDay: day, shiftCode: 'LOCKED', lines: [{ quantityBags: 1, unitPriceVnd: 7000 }], paidNowVnd: 7000, paymentMethod: 'cash' },
          p_idempotency_key: crypto.randomUUID(),
        }),
        client.rpc('record_receipt', {
          p_input: { customerId: customer!.id, operatingDay: day, amountVnd: 1000, paymentMethod: 'cash', allocations: [] },
          p_idempotency_key: crypto.randomUUID(),
        }),
        client.rpc('record_production_batch', {
          p_input: { operatingDay: day, shiftCode: 'ca_sang', machineId: machine!.id, startTime: `${day}T00:00:00+07:00`, endTime: `${day}T01:00:00+07:00`, goodBags: 1, rejectedBags: 0 },
          p_idempotency_key: crypto.randomUUID(),
        }),
        client.rpc('create_expense', {
          p_input: { operatingDay: day, categoryId: category!.id, amountVnd: 1000, payee: 'Locked fixture' },
          p_idempotency_key: crypto.randomUUID(),
        }),
        client.rpc('record_stock_count', {
          p_input: { operatingDay: day, actualBags: balance },
          p_idempotency_key: crypto.randomUUID(),
        }),
      ])
      expect(attempts.every((attempt) => attempt.error?.message.includes('DAY_LOCKED'))).toBe(true)

      const blankReopen = await client.rpc('reopen_operating_day', { p_day: day, p_reason: ' ' })
      expect(blankReopen.error?.message).toContain('REOPEN_REASON_REQUIRED')
      expect((await client.rpc('reopen_operating_day', { p_day: day, p_reason: 'Bổ sung chứng từ đối chiếu' })).error).toBeNull()
      const secondLock = await client.rpc('lock_operating_day', { p_day: day })
      expect(secondLock.error).toBeNull()
      expect((secondLock.data as { snapshotVersion: number }).snapshotVersion).toBe(2)

      const { data: operatingDay } = await adminClient.from('operating_days')
        .select('status, snapshot_version, snapshot').eq('day', day).single()
      expect(operatingDay?.status).toBe('locked')
      expect(operatingDay?.snapshot_version).toBe(2)
    } finally {
      await client.auth.signOut()
    }
  }, 60_000)
})
