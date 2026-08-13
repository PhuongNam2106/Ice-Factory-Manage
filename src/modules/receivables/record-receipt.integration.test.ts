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

const canRunLocalReceivablesIntegration = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
    isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('record_receipt RPC integration', () => {
  if (!canRunLocalReceivablesIntegration) {
    it.skip(
      'requires isolated local Supabase; skipped on remote or non-local environment',
      () => {},
    )
  } else {
    it('records receipts, updates receivable outstanding balance, and handles idempotency with strict cleanup', async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const suffix = String(Date.now()).slice(-7)
      const username = `rcpt${suffix}`
      const email = usernameToAuthEmail(username)
      const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
      const day = `2198-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
      const saleKey = crypto.randomUUID()
      const receiptKey1 = crypto.randomUUID()
      const receiptKey2 = crypto.randomUUID()

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

        await adminClient.from('profiles').insert({
          id: userId,
          username,
          phone: null,
          full_name: 'Receivables integration employee',
          role: 'employee',
        })

        await adminClient.from('operating_days').insert({ day })

        const { data: customer } = await adminClient
          .from('customers')
          .insert({ name: 'Receivables integration customer', created_by: userId })
          .select('id')
          .single()
        customerId = customer!.id

        await adminClient.from('inventory_ledger').insert({
          operating_day: day,
          kind: 'opening',
          quantity_delta_bags: 100,
          source_type: 'integration_fixture',
          source_id: crypto.randomUUID(),
          created_by: userId,
        })

        const { error: signInError } = await client.auth.signInWithPassword({ email, password })
        expect(signInError).toBeNull()

        // 1. Create a wholesale credit sale (Total = 100,000, Paid = 0, Receivable = 100,000)
        const saleRes = await client.rpc('create_sale', {
          p_input: {
            kind: 'wholesale' as const,
            operatingDay: day,
            customerId,
            lines: [{ quantityBags: 10, unitPriceVnd: 10000 }],
            paidNowVnd: 0,
            paymentMethod: 'cash' as const,
          },
          p_idempotency_key: saleKey,
        })
        expect(saleRes.error).toBeNull()

        const { data: recData } = await adminClient
          .from('receivables')
          .select('id, outstanding_amount_vnd, status')
          .eq('customer_id', customerId)
          .single()

        expect(recData).not.toBeNull()
        expect(Number(recData!.outstanding_amount_vnd)).toBe(100000)
        expect(recData!.status).toBe('open')

        const receivableId = recData!.id

        // 2. Record partial receipt 60,000 allocated to receivable
        const receiptRes1 = await client.rpc('record_receipt', {
          p_input: {
            customerId,
            operatingDay: day,
            amountVnd: 60000,
            paymentMethod: 'bank_transfer' as const,
            note: 'Trả bớt 60k',
            allocations: [{ receivableId, amountVnd: 60000 }],
          },
          p_idempotency_key: receiptKey1,
        })
        expect(receiptRes1.error).toBeNull()

        const { data: recDataAfter1 } = await adminClient
          .from('receivables')
          .select('outstanding_amount_vnd, status')
          .eq('id', receivableId)
          .single()

        expect(Number(recDataAfter1!.outstanding_amount_vnd)).toBe(40000)
        expect(recDataAfter1!.status).toBe('open')

        // 3. Test idempotency
        const receiptRes1Repeat = await client.rpc('record_receipt', {
          p_input: {
            customerId,
            operatingDay: day,
            amountVnd: 60000,
            paymentMethod: 'bank_transfer' as const,
            note: 'Trả bớt 60k',
            allocations: [{ receivableId, amountVnd: 60000 }],
          },
          p_idempotency_key: receiptKey1,
        })
        expect(receiptRes1Repeat.data).toEqual(receiptRes1.data)

        // 4. Record remaining 40,000 receipt -> receivable becomes paid
        const receiptRes2 = await client.rpc('record_receipt', {
          p_input: {
            customerId,
            operatingDay: day,
            amountVnd: 40000,
            paymentMethod: 'cash' as const,
            allocations: [{ receivableId, amountVnd: 40000 }],
          },
          p_idempotency_key: receiptKey2,
        })
        expect(receiptRes2.error).toBeNull()

        const { data: recDataAfter2 } = await adminClient
          .from('receivables')
          .select('outstanding_amount_vnd, status')
          .eq('id', receivableId)
          .single()

        expect(Number(recDataAfter2!.outstanding_amount_vnd)).toBe(0)
        expect(recDataAfter2!.status).toBe('paid')
      } finally {
        await client.auth.signOut()

        if (userId) {
          await adminClient.from('receipt_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('receivables').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('sale_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          await adminClient.from('inventory_ledger').delete().eq('created_by', userId)
          if (customerId) {
            await adminClient.from('customers').delete().eq('id', customerId)
          }
          await adminClient.from('operating_days').delete().eq('day', day)
          await adminClient.from('profiles').delete().eq('id', userId)
          await adminClient.auth.admin.deleteUser(userId)
        }
      }
    }, 45_000)
  }
})
