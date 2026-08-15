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

describe('inventory concurrency integration', () => {
  if (!canRun) {
    it.skip('requires an isolated local Supabase reset', () => {})
    return
  }

  it('allows exactly one of two concurrent sales when only one bag remains', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
    const email = usernameToAuthEmail('quanly')
    const day = `2196-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
    const clients = [createClient<Database>(url, key), createClient<Database>(url, key)]

    await adminClient.from('operating_days').upsert({ day }, { onConflict: 'day' })
    for (const client of clients) {
      expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull()
    }

    try {
      const count = await clients[0].rpc('record_stock_count', {
        p_input: { operatingDay: day, actualBags: 1, note: 'Concurrency fixture' },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(count.error).toBeNull()

      const saleKeys = [crypto.randomUUID(), crypto.randomUUID()]
      const results = await Promise.all(
        clients.map((client, index) =>
          client.rpc('create_sale', {
            p_input: {
              kind: 'retail',
              operatingDay: day,
              shiftCode: `RACE_${index}`,
              lines: [{ quantityBags: 1, unitPriceVnd: 7000 }],
              paidNowVnd: 7000,
              paymentMethod: 'cash',
            },
            p_idempotency_key: saleKeys[index],
          }),
        ),
      )

      expect(results.filter((result) => result.error === null)).toHaveLength(1)
      const failures = results.filter((result) => result.error !== null)
      expect(failures).toHaveLength(1)
      expect(failures[0].error?.message).toContain('INSUFFICIENT_STOCK')

      const { data: sales, error: salesError } = await adminClient
        .from('sales')
        .select('id')
        .in('idempotency_key', saleKeys)
      expect(salesError).toBeNull()
      expect(sales).toHaveLength(1)

      const { count: movementCount, error: movementError } = await adminClient
        .from('inventory_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('kind', 'sale')
        .eq('source_id', sales![0].id)
      expect(movementError).toBeNull()
      expect(movementCount).toBe(1)

      const { data: movements, error: balanceError } = await adminClient
        .from('inventory_ledger')
        .select('quantity_delta_bags')
      expect(balanceError).toBeNull()
      expect(movements!.reduce((sum, row) => sum + Number(row.quantity_delta_bags), 0)).toBe(0)
    } finally {
      await Promise.all(clients.map((client) => client.auth.signOut()))
    }
  }, 45_000)
})
