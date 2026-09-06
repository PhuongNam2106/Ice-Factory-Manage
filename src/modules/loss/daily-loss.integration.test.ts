import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database, Json } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalUrl(url?: string) {
  if (!url) return false
  return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname)
}

function addDays(day: string, amount: number) {
  const value = new Date(`${day}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' &&
    isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
)

describe('daily loss RPC integration', () => {
  if (!canRun) {
    it.skip('requires an isolated local Supabase database', () => {})
    return
  }

  it('reconciles authoritative production and sales, versions edits, and detects stale data', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const employeeId = '11111111-1111-1111-1111-111111111111'
    const managerId = '22222222-2222-2222-2222-222222222222'
    const machineId = '55555555-5555-4555-8555-555555555555'
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD ?? '123456'
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const manager = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    expect((await client.auth.signInWithPassword({
      email: usernameToAuthEmail('nhanvien'),
      password,
    })).error).toBeNull()
    expect((await manager.auth.signInWithPassword({
      email: usernameToAuthEmail('quanly'),
      password,
    })).error).toBeNull()

    const suffix = Number(String(Date.now()).slice(-4))
    const day = `2188-${String((suffix % 10) + 1).padStart(2, '0')}-${String((suffix % 20) + 1).padStart(2, '0')}`
    const previousDay = addDays(day, -1)
    await adminClient.from('operating_days').insert([
      {
        day: previousDay,
        status: 'locked',
        locked_at: new Date().toISOString(),
        locked_by: managerId,
      },
      { day, status: 'open' },
    ])
    await adminClient.from('daily_loss_reports').insert({
      operating_day: previousDay,
      opening_bags: 0,
      produced_bags: 100,
      sold_bags: 0,
      closing_bags: 100,
      difference_bags: 0,
      difference_pct: 0,
      classification: 'matched',
      warning_pct: 5,
      requires_review: false,
      source_snapshot: {} as Json,
      created_by: managerId,
      updated_by: managerId,
    })

    const { data: productionDay, error: productionDayError } = await adminClient
      .from('production_days')
      .insert({
        production_date: day,
        starts_at: `${day}T13:00:00.000Z`,
        ends_at: `${addDays(day, 1)}T13:00:00.000Z`,
      })
      .select('id')
      .single()
    expect(productionDayError).toBeNull()
    const { data: run, error: runError } = await adminClient
      .from('machine_runs')
      .insert({
        machine_id: machineId,
        production_day_id: productionDay!.id,
        started_at: `${day}T13:00:00.000Z`,
        started_by: employeeId,
        stopped_at: `${day}T18:00:00.000Z`,
        stopped_by: employeeId,
      })
      .select('id')
      .single()
    expect(runError).toBeNull()
    const quantityTime = new Date().toISOString()
    expect((await adminClient.from('machine_harvests').insert([
      {
        machine_id: machineId,
        machine_run_id: run!.id,
        harvested_at: `${day}T14:00:00.000Z`,
        harvested_by: employeeId,
        bag_quantity: 250,
        quantity_updated_at: quantityTime,
        quantity_updated_by: employeeId,
      },
      {
        machine_id: machineId,
        machine_run_id: run!.id,
        harvested_at: `${day}T15:00:00.000Z`,
        harvested_by: employeeId,
        bag_quantity: 250,
        quantity_updated_at: quantityTime,
        quantity_updated_by: employeeId,
      },
    ])).error).toBeNull()

    const sale = await client.rpc('create_sale', {
      p_input: {
        kind: 'retail',
        occurredAt: `${day}T16:00:00.000Z`,
        shiftCode: `LOSS-${suffix}`,
        lines: [{ quantityBags: 450, unitPriceVnd: 1 }],
        paidNowVnd: 450,
        paymentMethod: 'cash',
      },
      p_idempotency_key: crypto.randomUUID(),
    })
    expect(sale.error).toBeNull()

    const key = crypto.randomUUID()
    const input = {
      operatingDay: day,
      closingBags: 140,
    }
    const first = await client.rpc('save_daily_loss_report', {
      p_input: input,
      p_idempotency_key: key,
    })
    const repeated = await client.rpc('save_daily_loss_report', {
      p_input: input,
      p_idempotency_key: key,
    })
    expect(first.error).toBeNull()
    expect(repeated.data).toEqual(first.data)
    expect(first.data).toMatchObject({
      operatingDay: day,
      openingBags: 100,
      producedBags: 500,
      soldBags: 450,
      closingBags: 140,
      differenceBags: 10,
      differencePct: '2.000',
      classification: 'loss',
      requiresReview: false,
      isStale: false,
    })
    const reportId = (first.data as { id: string }).id
    expect((await adminClient.from('daily_loss_report_versions').select('id', { count: 'exact', head: true }).eq('report_id', reportId)).count).toBe(1)

    const { data: pending } = await adminClient.from('machine_harvests').insert({
      machine_id: machineId,
      machine_run_id: run!.id,
      harvested_at: `${day}T17:00:00.000Z`,
      harvested_by: employeeId,
    }).select('id').single()
    const stale = await client.rpc('get_daily_loss_report', { p_day: day })
    expect(stale.data).toMatchObject({ isStale: true, pendingHarvestCount: 1 })

    await adminClient.from('machine_harvests').update({
      bag_quantity: 0,
      quantity_updated_at: new Date().toISOString(),
      quantity_updated_by: employeeId,
    }).eq('id', pending!.id)
    const warning = await client.rpc('save_daily_loss_report', {
      p_input: { ...input, closingBags: 120, expectedVersion: 1 },
      p_idempotency_key: crypto.randomUUID(),
    })
    expect(warning.error).toBeNull()
    expect(warning.data).toMatchObject({
      differenceBags: 30,
      differencePct: '6.000',
      requiresReview: true,
      version: 2,
    })
    const confirmed = await manager.rpc('confirm_daily_loss_warning', {
      p_report_id: reportId,
      p_expected_version: 2,
    })
    expect(confirmed.error).toBeNull()
    expect(confirmed.data).toMatchObject({ version: 3, canFinalize: true })

    await Promise.all([client.auth.signOut(), manager.auth.signOut()])
  }, 45_000)
})
