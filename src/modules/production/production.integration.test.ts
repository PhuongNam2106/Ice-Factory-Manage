// @vitest-environment node

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
  process.env.RUN_SUPABASE_INTEGRATION === 'true'
    && isLocalUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    && process.env.SUPABASE_SERVICE_ROLE_KEY
    && process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD,
)

describe('realtime machine production RPC integration', () => {
  if (!canRun) {
    it.skip('requires isolated local Supabase', () => {})
    return
  }

  it(
    'records an idempotent run and harvest without changing inventory',
    async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
      const employee = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )
      const manager = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )
      expect((await employee.auth.signInWithPassword({
        email: usernameToAuthEmail('nhanvien'),
        password,
      })).error).toBeNull()
      expect((await manager.auth.signInWithPassword({
        email: usernameToAuthEmail('quanly'),
        password,
      })).error).toBeNull()

      const suffix = String(Date.now()).slice(-7)
      const machine = await adminClient.from('machines').insert({
        name: `Realtime machine ${suffix}`,
        code: `RT${suffix}`,
        created_by: '22222222-2222-2222-2222-222222222222',
      }).select('id').single()
      expect(machine.error).toBeNull()
      const machineId = machine.data!.id
      const inventoryBefore = await adminClient.from('inventory_ledger').select('id')
      const startKey = crypto.randomUUID()

      try {
        const started = await employee.rpc('start_machine', {
          p_machine_id: machineId,
          p_idempotency_key: startKey,
        })
        expect(started.error).toBeNull()
        expect(started.data).toMatchObject({ machineId })
        const runId = (started.data as { runId: string }).runId

        const repeated = await employee.rpc('start_machine', {
          p_machine_id: machineId,
          p_idempotency_key: startKey,
        })
        expect(repeated.data).toEqual(started.data)

        const harvest = await employee.rpc('record_machine_harvest', {
          p_machine_id: machineId,
          p_idempotency_key: crypto.randomUUID(),
        })
        expect(harvest.error).toBeNull()
        const harvestId = (harvest.data as { harvestId: string }).harvestId

        const pendingConflict = await employee.rpc('record_machine_harvest', {
          p_machine_id: machineId,
          p_idempotency_key: crypto.randomUUID(),
        })
        expect(pendingConflict.error?.message).toContain('PENDING_HARVEST_EXISTS')

        const zeroQuantity = await employee.rpc('set_harvest_quantity', {
          p_harvest_id: harvestId,
          p_quantity: 0,
          p_idempotency_key: crypto.randomUUID(),
        })
        expect(zeroQuantity.error).toBeNull()
        expect(zeroQuantity.data).toMatchObject({ harvestId, quantity: 0 })

        const correctedQuantity = await employee.rpc('set_harvest_quantity', {
          p_harvest_id: harvestId,
          p_quantity: 42,
          p_idempotency_key: crypto.randomUUID(),
        })
        expect(correctedQuantity.error).toBeNull()
        expect(correctedQuantity.data).toMatchObject({ harvestId, quantity: 42 })

        expect((await manager.rpc('set_harvest_quantity', {
          p_harvest_id: harvestId,
          p_quantity: 43,
          p_idempotency_key: crypto.randomUUID(),
        })).error).toBeNull()
        const originalEmployeeCorrection = await employee.rpc('set_harvest_quantity', {
          p_harvest_id: harvestId,
          p_quantity: 44,
          p_idempotency_key: crypto.randomUUID(),
        })
        expect(originalEmployeeCorrection.error).toBeNull()

        const stopped = await employee.rpc('stop_machine', {
          p_machine_id: machineId,
          p_idempotency_key: crypto.randomUUID(),
        })
        expect(stopped.error).toBeNull()
        expect(stopped.data).toMatchObject({ runId })

        const [runs, harvests, revisions, inventoryAfter] = await Promise.all([
          adminClient.from('machine_runs').select('*').eq('machine_id', machineId),
          adminClient.from('machine_harvests').select('*').eq('machine_id', machineId),
          adminClient.from('machine_harvest_revisions').select('*').eq('harvest_id', harvestId).order('changed_at'),
          adminClient.from('inventory_ledger').select('id'),
        ])
        expect(runs.data).toHaveLength(1)
        expect(harvests.data).toHaveLength(1)
        expect(revisions.data?.map((row) => [row.old_quantity, row.new_quantity])).toEqual([
          [null, 0],
          [0, 42],
          [42, 43],
          [43, 44],
        ])
        expect(inventoryAfter.data).toHaveLength(inventoryBefore.data?.length ?? 0)
      } finally {
        await employee.auth.signOut(); await manager.auth.signOut()
        const harvestIds = (await adminClient.from('machine_harvests').select('id').eq('machine_id', machineId)).data?.map((row) => row.id) ?? []
        if (harvestIds.length) await adminClient.from('machine_harvest_revisions').delete().in('harvest_id', harvestIds)
        await adminClient.from('machine_harvests').delete().eq('machine_id', machineId)
        const productionDayIds = (await adminClient.from('machine_runs').select('production_day_id').eq('machine_id', machineId)).data?.map((row) => row.production_day_id) ?? []
        await adminClient.from('machine_runs').delete().eq('machine_id', machineId)
        if (productionDayIds.length) await adminClient.from('production_days').delete().in('id', productionDayIds)
        await adminClient.from('machines').delete().eq('id', machineId)
      }
    },
    45_000,
  )

  it(
    'lets a manager correct time, then lock and reopen the production day with audit',
    async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
      const manager = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      )
      expect((await manager.auth.signInWithPassword({
        email: usernameToAuthEmail('quanly'),
        password,
      })).error).toBeNull()

      const machineId = '55555555-5555-4555-8555-555555555555'
      const started = await manager.rpc('start_machine', {
        p_machine_id: machineId,
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(started.error).toBeNull()
      const runId = (started.data as { runId: string; productionDate: string }).runId
      const productionDate = (started.data as { productionDate: string }).productionDate
      expect((await manager.rpc('stop_machine', {
        p_machine_id: machineId,
        p_idempotency_key: crypto.randomUUID(),
      })).error).toBeNull()

      const run = await adminClient.from('machine_runs').select('started_at').eq('id', runId).single()
      const correctedStart = new Date(new Date(run.data!.started_at).getTime() - 60_000).toISOString()
      const correction = await manager.rpc('correct_production_action', {
        p_input: { actionType: 'change_run_start', runId, occurredAt: correctedStart },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(correction.error).toBeNull()

      const locked = await manager.rpc('lock_production_day', { p_production_date: productionDate })
      expect(locked.error).toBeNull()
      expect(locked.data).toMatchObject({ productionDate, status: 'locked' })

      const blockedCorrection = await manager.rpc('correct_production_action', {
        p_input: { actionType: 'change_run_start', runId, occurredAt: new Date().toISOString() },
        p_idempotency_key: crypto.randomUUID(),
      })
      expect(blockedCorrection.error?.message).toContain('PRODUCTION_DAY_LOCKED')

      expect((await manager.rpc('reopen_production_day', {
        p_production_date: productionDate,
      })).error).toBeNull()
      const audit = await adminClient.from('audit_log')
        .select('action, before_data, after_data')
        .eq('entity_id', runId)
        .eq('action', 'machine_run.start_time_changed')
      expect(audit.data).toHaveLength(1)
      expect(audit.data?.[0].before_data).not.toEqual(audit.data?.[0].after_data)

      await manager.auth.signOut()
    },
    45_000,
  )

  it(
    'lets only a manager delete machine actions from newest to oldest with audit',
    async () => {
      const { adminClient } = await import('@/lib/supabase/admin')
      const password = process.env.SUPABASE_TEST_EMPLOYEE_PASSWORD!
      const employee = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
      const manager = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
      expect((await employee.auth.signInWithPassword({ email: usernameToAuthEmail('nhanvien'), password })).error).toBeNull()
      expect((await manager.auth.signInWithPassword({ email: usernameToAuthEmail('quanly'), password })).error).toBeNull()

      const suffix = String(Date.now()).slice(-7)
      const created = await adminClient.from('machines').insert({
        name: `Delete action machine ${suffix}`,
        code: `DA${suffix}`,
        created_by: '22222222-2222-2222-2222-222222222222',
      }).select('id').single()
      expect(created.error).toBeNull()
      const machineId = created.data!.id
      let productionDayId: string | undefined

      try {
        const started = await manager.rpc('start_machine', { p_machine_id: machineId, p_idempotency_key: crypto.randomUUID() })
        expect(started.error).toBeNull()
        const runId = (started.data as { runId: string }).runId
        productionDayId = (await adminClient.from('machine_runs').select('production_day_id').eq('id', runId).single()).data?.production_day_id
        const harvested = await manager.rpc('record_machine_harvest', { p_machine_id: machineId, p_idempotency_key: crypto.randomUUID() })
        const harvestId = (harvested.data as { harvestId: string }).harvestId
        expect((await manager.rpc('set_harvest_quantity', { p_harvest_id: harvestId, p_quantity: 24, p_idempotency_key: crypto.randomUUID() })).error).toBeNull()
        expect((await manager.rpc('stop_machine', { p_machine_id: machineId, p_idempotency_key: crypto.randomUUID() })).error).toBeNull()

        const deleteArgs = {
          p_action_type: 'stop', p_machine_id: machineId, p_run_id: runId,
          p_harvest_id: null, p_idempotency_key: crypto.randomUUID(),
        } as unknown as Database['public']['Functions']['delete_production_action']['Args']
        expect((await employee.rpc('delete_production_action', deleteArgs)).error?.message).toContain('FORBIDDEN')

        const outOfOrder = {
          p_action_type: 'harvest', p_machine_id: machineId, p_run_id: null,
          p_harvest_id: harvestId, p_idempotency_key: crypto.randomUUID(),
        } as unknown as Database['public']['Functions']['delete_production_action']['Args']
        expect((await manager.rpc('delete_production_action', outOfOrder)).error?.message).toContain('DELETE_ACTION_NOT_LATEST')

        const deletionKey = crypto.randomUUID()
        const stopDeletion = { ...deleteArgs, p_idempotency_key: deletionKey }
        const deletedStop = await manager.rpc('delete_production_action', stopDeletion)
        expect(deletedStop.error).toBeNull()
        expect((await manager.rpc('delete_production_action', stopDeletion)).data).toEqual(deletedStop.data)
        expect((await adminClient.from('machine_runs').select('stopped_at').eq('id', runId).single()).data?.stopped_at).toBeNull()

        expect((await manager.rpc('delete_production_action', { ...outOfOrder, p_idempotency_key: crypto.randomUUID() })).error).toBeNull()
        expect((await manager.rpc('delete_production_action', {
          ...deleteArgs, p_action_type: 'start', p_idempotency_key: crypto.randomUUID(),
        })).error).toBeNull()

        const audit = await adminClient.from('audit_log').select('action, before_data').in('entity_id', [runId, harvestId])
        expect(audit.data?.map((item) => item.action).sort()).toEqual([
          'machine_harvest.deleted', 'machine_run.start_deleted', 'machine_run.stop_deleted',
        ])
        const harvestAudit = audit.data?.find((item) => item.action === 'machine_harvest.deleted')
        expect((harvestAudit?.before_data as { quantity_revisions?: unknown[] }).quantity_revisions).toHaveLength(1)
      } finally {
        await employee.auth.signOut(); await manager.auth.signOut()
        await adminClient.from('production_action_requests').delete().eq('machine_id', machineId)
        await adminClient.from('machine_harvests').delete().eq('machine_id', machineId)
        await adminClient.from('machine_runs').delete().eq('machine_id', machineId)
        if (productionDayId) await adminClient.from('production_days').delete().eq('id', productionDayId)
        await adminClient.from('machines').delete().eq('id', machineId)
      }
    },
    45_000,
  )
})
