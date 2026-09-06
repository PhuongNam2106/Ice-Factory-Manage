import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalSupabaseUrl(url?: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '0.0.0.0'
    )
  } catch {
    return false
  }
}

const canRunLocalSalesIntegration = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
    isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('create_sale RPC integration', () => {
  if (!canRunLocalSalesIntegration) {
    it.skip(
      'requires isolated local Supabase; skipped on remote or non-local environment',
      () => {},
    )
  } else {
    it('derives the 20h day, ignores legacy stock, rejects locked days, and stays idempotent', async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const suffix = String(Date.now()).slice(-7)
      const username = `sale${suffix}`
      const email = usernameToAuthEmail(username)
      const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
      const day = `2192-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
      const previousDay = new Date(`${day}T00:00:00.000Z`)
      previousDay.setUTCDate(previousDay.getUTCDate() - 1)
      const previousDayString = previousDay.toISOString().slice(0, 10)
      const lockedDay = `2199-01-01`
      const key = crypto.randomUUID()
      const failedKey = crypto.randomUUID()
      const retailKey1 = crypto.randomUUID()
      const retailKey2 = crypto.randomUUID()
      const lockedDayKey = crypto.randomUUID()
      const beforeBoundaryKey = crypto.randomUUID()
      const beforeCutoverKey = crypto.randomUUID()

      let userId: string | null = null
      let customerId: string | null = null

      const client = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )

      try {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
        expect(authError).toBeNull()
        userId = authData.user!.id

        const { error: profileError } = await adminClient.from('profiles').insert({
          id: userId,
          username,
          phone: null,
          full_name: 'Sales integration employee',
          role: 'employee',
        })
        expect(profileError).toBeNull()

        await adminClient.from('settings').update({
          operating_day_cutover_at: '2026-09-05T13:00:00.000Z',
        }).eq('id', true)
        const operatingDays = await adminClient.from('operating_days').insert([
          { day: previousDayString, status: 'open' },
          { day, status: 'open' },
          { day: lockedDay, status: 'locked', locked_at: new Date().toISOString(), locked_by: userId },
        ])
        expect(operatingDays.error).toBeNull()

        const { data: customer } = await adminClient
          .from('customers')
          .insert({ name: 'Sales integration customer', created_by: userId })
          .select('id')
          .single()
        customerId = customer!.id

        const { error: signInError } = await client.auth.signInWithPassword({ email, password })
        expect(signInError).toBeNull()

        // 1. Idempotency test
        const input = {
          kind: 'wholesale' as const,
          occurredAt: `${day}T13:00:00.000Z`,
          customerId,
          lines: [{ quantityBags: 10, unitPriceVnd: 7000 }],
          paidNowVnd: 0,
          paymentMethod: 'cash' as const,
        }
        const first = await client.rpc('create_sale', { p_input: input, p_idempotency_key: key })
        const second = await client.rpc('create_sale', { p_input: input, p_idempotency_key: key })
        expect(first.error).toBeNull()
        expect(second.error).toBeNull()
        expect(second.data).toEqual(first.data)

        const saleId = (first.data as { saleId: string }).saleId
        const { count: salesCount } = await adminClient
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('idempotency_key', key)
        const { data: stockIssues } = await adminClient
          .from('inventory_ledger')
          .select('id')
          .eq('kind', 'sale')
          .eq('source_id', saleId)
        expect(salesCount).toBe(1)
        expect(stockIssues).toHaveLength(0)

        const beforeBoundary = await client.rpc('create_sale', {
          p_input: { ...input, occurredAt: `${day}T12:59:59.999Z` },
          p_idempotency_key: beforeBoundaryKey,
        })
        expect(beforeBoundary.error).toBeNull()
        const beforeBoundarySaleId = (beforeBoundary.data as { saleId: string }).saleId
        expect((await adminClient.from('sales').select('operating_day').eq('id', beforeBoundarySaleId).single()).data?.operating_day).toBe(previousDayString)

        // 2. Sales no longer depend on the legacy inventory ledger.
        const failed = await client.rpc('create_sale', {
          p_input: {
            kind: 'retail' as const,
            occurredAt: `${day}T13:05:00.000Z`,
            shiftCode: 'OVERSELL',
            lines: [{ quantityBags: 1000, unitPriceVnd: 7000 }],
            paidNowVnd: 7000000,
            paymentMethod: 'cash' as const,
          },
          p_idempotency_key: failedKey,
        })
        expect(failed.error).toBeNull()
        const { count: failedSales } = await adminClient
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('idempotency_key', failedKey)
        expect(failedSales).toBe(1)

        // 3. Locked day test
        const lockedRes = await client.rpc('create_sale', {
          p_input: {
            kind: 'wholesale' as const,
            occurredAt: `${lockedDay}T13:00:00.000Z`,
            customerId,
            lines: [{ quantityBags: 1, unitPriceVnd: 7000 }],
            paidNowVnd: 7000,
            paymentMethod: 'cash' as const,
          },
          p_idempotency_key: lockedDayKey,
        })
        expect(lockedRes.error?.message).toContain('DAY_LOCKED')

        // 4. Duplicate retail shift test
        const retailInput1 = {
          kind: 'retail' as const,
          occurredAt: `${day}T13:10:00.000Z`,
          shiftCode: 'SHIFT_A',
          lines: [{ quantityBags: 2, unitPriceVnd: 10000 }],
          paidNowVnd: 20000,
          paymentMethod: 'cash' as const,
        }
        const retail1 = await client.rpc('create_sale', { p_input: retailInput1, p_idempotency_key: retailKey1 })
        expect(retail1.error).toBeNull()

        const retail2 = await client.rpc('create_sale', { p_input: retailInput1, p_idempotency_key: retailKey2 })
        expect(retail2.error?.message).toContain('sales_active_retail_shift_key')

        const beforeCutover = await client.rpc('create_sale', {
          p_input: { ...input, occurredAt: '2026-09-05T12:59:59.999Z' },
          p_idempotency_key: beforeCutoverKey,
        })
        expect(beforeCutover.error?.message).toContain('OCCURRED_AT_BEFORE_CUTOVER')
      } finally {
        await client.auth.signOut()

        if (userId) {
          await adminClient.from('sale_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('receipt_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('receivables').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('inventory_ledger').delete().eq('created_by', userId)
          if (customerId) {
            await adminClient.from('customers').delete().eq('id', customerId)
          }
          await adminClient.from('operating_days').delete().in('day', [previousDayString, day, lockedDay])
          await adminClient.from('settings').update({ operating_day_cutover_at: null }).eq('id', true)
          await adminClient.from('profiles').delete().eq('id', userId)
          await adminClient.auth.admin.deleteUser(userId)
        }
      }
    }, 45_000)
  }
})
