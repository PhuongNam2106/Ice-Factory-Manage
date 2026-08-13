import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { ProductionBatch, ProductionShiftTotal, SelectProductionSource } from './schema'
import { calculateProductionVariance } from './schema'
import type { ProductionReconciliationSummary } from './types'

export type ProductionClient = Pick<SupabaseClient<Database>, 'from' | 'rpc'>

function withoutIdempotencyKey<T extends { idempotencyKey: string }>(input: T) {
  const payload = { ...input } as Omit<T, 'idempotencyKey'> & { idempotencyKey?: string }
  delete payload.idempotencyKey
  return payload as unknown as Json
}

export function createProductionBatchRecord(client: ProductionClient, input: ProductionBatch) {
  return client.rpc('record_production_batch', {
    p_input: withoutIdempotencyKey(input),
    p_idempotency_key: input.idempotencyKey,
  })
}

export function createProductionShiftTotalRecord(
  client: ProductionClient,
  input: ProductionShiftTotal,
) {
  return client.rpc('record_production_shift_total', {
    p_input: withoutIdempotencyKey(input),
    p_idempotency_key: input.idempotencyKey,
  })
}

export function selectProductionSourceRecord(
  client: ProductionClient,
  input: SelectProductionSource,
) {
  return client.rpc('select_production_source', {
    p_input: withoutIdempotencyKey(input),
    p_idempotency_key: input.idempotencyKey,
  })
}

export async function listProductionReconciliations(
  client: ProductionClient,
  operatingDay: string,
): Promise<ProductionReconciliationSummary[]> {
  const [batchesResult, totalsResult, selectionsResult] = await Promise.all([
    client
      .from('production_batches')
      .select('id, shift_code, machine_id, good_bags, status, machines(name)')
      .eq('operating_day', operatingDay)
      .eq('status', 'active'),
    client
      .from('production_shift_totals')
      .select('id, shift_code, machine_id, good_bags, machines(name)')
      .eq('operating_day', operatingDay),
    client
      .from('production_source_selections')
      .select('shift_code, machine_id, selected_source, is_confirmed, official_quantity_bags')
      .eq('operating_day', operatingDay),
  ])

  if (batchesResult.error || totalsResult.error || selectionsResult.error) {
    throw new Error('Không thể tải dữ liệu đối soát sản xuất.')
  }

  type Key = string
  type Row = ProductionReconciliationSummary
  const rows = new Map<Key, Row>()
  const ensureRow = (machineId: string, shiftCode: Row['shiftCode'], machineName: string) => {
    const key = `${machineId}:${shiftCode}`
    let row = rows.get(key)
    if (!row) {
      row = {
        operatingDay,
        shiftCode,
        machineId,
        machineName,
        batchGoodBags: 0,
        shiftGoodBags: null,
        selectedSource: 'batches',
        isConfirmed: false,
        diffBags: '0',
        pct: '0',
        hasDiscrepancy: false,
        officialQuantityBags: 0,
      }
      rows.set(key, row)
    }
    return row
  }

  for (const batch of batchesResult.data) {
    const row = ensureRow(batch.machine_id, batch.shift_code as Row['shiftCode'], batch.machines.name)
    row.batchGoodBags += Number(batch.good_bags)
  }
  for (const total of totalsResult.data) {
    const row = ensureRow(total.machine_id, total.shift_code as Row['shiftCode'], total.machines.name)
    row.shiftGoodBags = Number(total.good_bags)
  }
  for (const selection of selectionsResult.data) {
    const existing = rows.get(`${selection.machine_id}:${selection.shift_code}`)
    if (!existing) continue
    existing.selectedSource = selection.selected_source
    existing.isConfirmed = selection.is_confirmed
    existing.officialQuantityBags = Number(selection.official_quantity_bags)
  }

  return [...rows.values()].map((row) => {
    if (row.shiftGoodBags === null) return row
    const variance = calculateProductionVariance(row.batchGoodBags, row.shiftGoodBags)
    return { ...row, diffBags: variance.bags, pct: variance.pct, hasDiscrepancy: variance.hasDiscrepancy }
  })
}
