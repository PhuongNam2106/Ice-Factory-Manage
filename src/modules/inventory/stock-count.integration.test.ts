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

describe('record_stock_count RPC integration', () => {
  if (!canRun) {
    it.skip('requires isolated local Supabase', () => {})
    return
  }

  it('is idempotent, reconciles the balance, and keeps ledger rows immutable', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const day = `2188-${String((Date.now() % 12) + 1).padStart(2, '0')}-${String((Date.now() % 27) + 1).padStart(2, '0')}`
    const actorId = '22222222-2222-2222-2222-222222222222'
    const key = crypto.randomUUID()
    const openingSourceId = crypto.randomUUID()
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )

    const baselineRows = await adminClient.from('inventory_ledger').select('quantity_delta_bags')
    expect(baselineRows.error).toBeNull()
    const baseline = baselineRows.data!.reduce((sum, row) => sum + row.quantity_delta_bags, 0)

    expect((await adminClient.from('operating_days').insert({ day })).error).toBeNull()
    const opening = await adminClient
      .from('inventory_ledger')
      .insert({
        operating_day: day,
        kind: 'opening',
        quantity_delta_bags: 100,
        source_type: 'stock_count_integration_fixture',
        source_id: openingSourceId,
        created_by: actorId,
      })
      .select('id')
      .single()
    expect(opening.error).toBeNull()
    expect(
      (await client.auth.signInWithPassword({
        email: usernameToAuthEmail('quanly'),
        password: process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!,
      })).error,
    ).toBeNull()

    const input = { operatingDay: day, actualBags: baseline + 97, note: 'Integration count' }
    const first = await client.rpc('record_stock_count', { p_input: input, p_idempotency_key: key })
    const repeated = await client.rpc('record_stock_count', { p_input: input, p_idempotency_key: key })
    expect(first.error).toBeNull()
    expect(repeated.data).toEqual(first.data)
    expect(first.data).toMatchObject({ varianceBags: '-3', requiresReview: false })

    const countId = (first.data as { countId: string }).countId
    const { data: movements } = await adminClient
      .from('inventory_ledger')
      .select('kind, quantity_delta_bags')
      .in('source_id', [openingSourceId, countId])
    expect(movements?.reduce((sum, row) => sum + row.quantity_delta_bags, 0)).toBe(97)
    expect(movements?.filter((row) => row.kind === 'adjustment')).toHaveLength(1)

    const { count } = await adminClient
      .from('stock_counts')
      .select('id', { count: 'exact', head: true })
      .eq('id', countId)
    expect(count).toBe(1)

    const immutable = await adminClient
      .from('inventory_ledger')
      .update({ note: 'must fail' })
      .eq('id', opening.data!.id)
    expect(immutable.error?.message).toContain('INVENTORY_LEDGER_IS_APPEND_ONLY')
    await client.auth.signOut()
  }, 45_000)
})
