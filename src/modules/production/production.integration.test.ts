import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalUrl(url?: string) {
  if (!url) return false
  try {
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
    isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('production reconciliation RPC integration', () => {
  if (!canRun) {
    it.skip('requires isolated local Supabase', () => {})
    return
  }

  it('posts one official quantity, preserves reversal history, and requires a manager', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const suffix = String(Date.now()).slice(-7)
    const email = usernameToAuthEmail('quanly')
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
    const day = `2197-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )

    const userId = '22222222-2222-2222-2222-222222222222'
    await adminClient.from('profiles').update({ role: 'manager' }).eq('id', userId)
    await adminClient.from('operating_days').upsert({ day }, { onConflict: 'day' })
    const machine = await adminClient
      .from('machines')
      .insert({ name: `Production test ${suffix}`, code: `P${suffix}`, created_by: userId })
      .select('id')
      .single()
    expect(machine.error).toBeNull()
    const machineId = machine.data!.id
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull()

    try {
      const batch = await client.rpc('record_production_batch', {
        p_input: {
          operatingDay: day, shiftCode: 'ca_sang', machineId,
          startTime: `${day}T00:00:00+07:00`, endTime: `${day}T04:00:00+07:00`,
          goodBags: 120, rejectedBags: 1,
        },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(batch.error).toBeNull()

      const shift = await client.rpc('record_production_shift_total', {
        p_input: {
          operatingDay: day,
          shiftCode: 'ca_sang',
          machineId,
          goodBags: 125,
          rejectedBags: 0,
        },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(shift.error).toBeNull()

      await adminClient.from('profiles').update({ role: 'employee' }).eq('id', userId)
      const forbidden = await client.rpc('select_production_source', {
        p_input: {
          operatingDay: day,
          shiftCode: 'ca_sang',
          machineId,
          selectedSource: 'shift_total',
        },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(forbidden.error?.message).toContain('FORBIDDEN')

      await adminClient.from('profiles').update({ role: 'manager' }).eq('id', userId)
      const selection = await client.rpc('select_production_source', {
        p_input: {
          operatingDay: day,
          shiftCode: 'ca_sang',
          machineId,
          selectedSource: 'shift_total',
        },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(selection.error).toBeNull()

      const ledger = await adminClient.from('inventory_ledger')
        .select('kind, quantity_delta_bags')
        .eq('operating_day', day)
        .order('created_at')
      expect(ledger.error).toBeNull()
      expect(ledger.data).toHaveLength(3)
      expect(ledger.data!.reduce((sum, row) => sum + Number(row.quantity_delta_bags), 0)).toBe(125)
      expect(ledger.data!.map((row) => row.kind)).toEqual(['production', 'reversal', 'production'])

      const official = await adminClient.from('production_source_selections')
        .select('selected_source, official_quantity_bags, is_confirmed')
        .eq('operating_day', day)
        .eq('machine_id', machineId)
        .single()
      expect(official.data).toEqual({
        selected_source: 'shift_total', official_quantity_bags: 125, is_confirmed: true,
      })
    } finally {
      await client.auth.signOut()
      await adminClient.from('production_source_selections').delete().eq('machine_id', machineId)
      await adminClient.from('inventory_ledger').delete().eq('operating_day', day)
      await adminClient.from('production_shift_totals').delete().eq('machine_id', machineId)
      await adminClient.from('production_batches').delete().eq('machine_id', machineId)
      await adminClient.from('machines').delete().eq('id', machineId)
      await adminClient.from('operating_days').delete().eq('day', day)
      await adminClient.from('profiles').update({ role: 'manager' }).eq('id', userId)
    }
  }, 45_000)
})
