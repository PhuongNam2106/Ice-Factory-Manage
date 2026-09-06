import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database, Json } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'

function isLocalUrl(url?: string) {
  if (!url) return false
  try { return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname) } catch { return false }
}

function addDays(day: string, amount: number) {
  const value = new Date(`${day}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

const canRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === 'true' && isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('daily closing integration', () => {
  if (!canRun) { it.skip('requires an isolated local Supabase reset', () => {}); return }

  it('blocks incomplete loss data and locks/reopens operating and production together', async () => {
    const { adminClient } = await import('@/lib/supabase/admin')
    const managerId = '22222222-2222-2222-2222-222222222222'
    const employeeId = '11111111-1111-1111-1111-111111111111'
    const machineId = '55555555-5555-4555-8555-555555555555'
    const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
    const createAuthenticatedClient = () => createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    )
    const manager = createAuthenticatedClient()
    const employee = createAuthenticatedClient()
    expect((await manager.auth.signInWithPassword({ email: usernameToAuthEmail('quanly'), password })).error).toBeNull()
    expect((await employee.auth.signInWithPassword({ email: usernameToAuthEmail('nhanvien'), password })).error).toBeNull()

    const suffix = Number(String(Date.now()).slice(-4))
    const day = `2194-${String((suffix % 10) + 1).padStart(2, '0')}-${String((suffix % 20) + 1).padStart(2, '0')}`
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
      closing_bags: 100,
      difference_bags: -100,
      difference_pct: null,
      classification: 'no_production',
      warning_pct: 5,
      requires_review: true,
      source_snapshot: {} as Json,
      created_by: managerId,
      updated_by: managerId,
    })

    expect((await manager.rpc('lock_operating_day', { p_day: day })).error?.message).toContain('CLOSING_BLOCKED')

    const first = await employee.rpc('save_daily_loss_report', {
      p_input: { operatingDay: day, closingBags: 100 },
      p_idempotency_key: crypto.randomUUID(),
    })
    expect(first.error).toBeNull()
    const reportId = (first.data as { id: string }).id

    const { data: productionDay } = await adminClient.from('production_days').insert({
      production_date: day,
      starts_at: `${day}T13:00:00.000Z`,
      ends_at: `${addDays(day, 1)}T13:00:00.000Z`,
    }).select('id').single()
    const { data: run } = await adminClient.from('machine_runs').insert({
      machine_id: machineId,
      production_day_id: productionDay!.id,
      started_at: `${day}T13:00:00.000Z`,
      stopped_at: `${day}T18:00:00.000Z`,
      started_by: employeeId,
      stopped_by: employeeId,
    }).select('id').single()
    const { data: harvest } = await adminClient.from('machine_harvests').insert({
      machine_id: machineId,
      machine_run_id: run!.id,
      harvested_at: `${day}T14:00:00.000Z`,
      harvested_by: employeeId,
    }).select('id').single()

    const pending = await manager.rpc('get_daily_reconciliation', { p_day: day })
    expect(pending.data).toMatchObject({ checks: expect.arrayContaining([expect.objectContaining({ code: 'PENDING_HARVEST_QUANTITY' })]) })
    expect((await manager.rpc('lock_operating_day', { p_day: day })).error?.message).toContain('CLOSING_BLOCKED')

    await adminClient.from('machine_harvests').update({
      bag_quantity: 10,
      quantity_updated_at: new Date().toISOString(),
      quantity_updated_by: employeeId,
    }).eq('id', harvest!.id)
    const stale = await manager.rpc('get_daily_reconciliation', { p_day: day })
    expect(stale.data).toMatchObject({ checks: expect.arrayContaining([expect.objectContaining({ code: 'LOSS_REPORT_STALE' })]) })
    expect((await manager.rpc('lock_operating_day', { p_day: day })).error?.message).toContain('CLOSING_BLOCKED')

    const warning = await employee.rpc('save_daily_loss_report', {
      p_input: { operatingDay: day, closingBags: 100, expectedVersion: 1 },
      p_idempotency_key: crypto.randomUUID(),
    })
    expect(warning.data).toMatchObject({ differenceBags: 10, requiresReview: true, version: 2 })
    expect((await manager.rpc('lock_operating_day', { p_day: day })).error?.message).toContain('CLOSING_BLOCKED')

    expect((await employee.rpc('confirm_daily_loss_warning', { p_report_id: reportId, p_expected_version: 2 })).error?.message).toContain('FORBIDDEN')
    expect((await employee.rpc('lock_operating_day', { p_day: day })).error?.message).toContain('FORBIDDEN')
    expect((await employee.rpc('reopen_operating_day', { p_day: day, p_reason: 'Không có quyền' })).error?.message).toContain('FORBIDDEN')

    const confirmed = await manager.rpc('confirm_daily_loss_warning', { p_report_id: reportId, p_expected_version: 2 })
    expect(confirmed.error).toBeNull()
    const locked = await manager.rpc('lock_operating_day', { p_day: day })
    expect(locked.error).toBeNull()
    expect(locked.data).toMatchObject({ status: 'locked', snapshotVersion: 1 })

    const [operating, production] = await Promise.all([
      adminClient.from('operating_days').select('status').eq('day', day).single(),
      adminClient.from('production_days').select('status').eq('production_date', day).single(),
    ])
    expect(operating.data?.status).toBe('locked')
    expect(production.data?.status).toBe('locked')

    expect((await manager.rpc('reopen_operating_day', { p_day: day, p_reason: ' ' })).error?.message).toContain('REOPEN_REASON_REQUIRED')
    expect((await manager.rpc('reopen_operating_day', { p_day: day, p_reason: 'Bổ sung chứng từ đối chiếu' })).error).toBeNull()
    const [reopenedOperating, reopenedProduction] = await Promise.all([
      adminClient.from('operating_days').select('status').eq('day', day).single(),
      adminClient.from('production_days').select('status').eq('production_date', day).single(),
    ])
    expect(reopenedOperating.data?.status).toBe('open')
    expect(reopenedProduction.data?.status).toBe('open')

    const { count: reopenAuditCount } = await adminClient.from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', (await adminClient.from('operating_days').select('id').eq('day', day).single()).data!.id)
      .eq('action', 'operating_day.reopened')
    expect(reopenAuditCount).toBe(1)

    await Promise.all([manager.auth.signOut(), employee.auth.signOut()])
  }, 60_000)
})
