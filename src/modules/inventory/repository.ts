import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { StockCount } from './schema'
import type { InventoryLedgerItem, StockCountItem } from './types'

export type InventoryClient = Pick<SupabaseClient<Database>, 'from' | 'rpc'>
type StockCountRow = Database['public']['Tables']['stock_counts']['Row']

export function recordStockCountRecord(client: InventoryClient, input: StockCount) {
  const payload = { ...input } as Omit<StockCount, 'idempotencyKey'> & { idempotencyKey?: string }
  delete payload.idempotencyKey
  return client.rpc('record_stock_count', {
    p_input: payload as unknown as Json,
    p_idempotency_key: input.idempotencyKey,
  })
}

export async function getStockBalance(client: InventoryClient): Promise<string> {
  const { data, error } = await client.from('inventory_ledger').select('quantity_delta_bags')
  if (error) throw new Error('Không thể tải số dư kho.')
  return data.reduce((sum, row) => sum + row.quantity_delta_bags, 0).toString()
}

export async function listInventoryLedger(
  client: InventoryClient,
  limit = 100,
): Promise<InventoryLedgerItem[]> {
  const { data, error } = await client
    .from('inventory_ledger')
    .select('id, operating_day, kind, quantity_delta_bags, source_type, note, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Không thể tải sổ kho.')
  return data.map((row) => ({
    id: row.id,
    operatingDay: row.operating_day,
    kind: row.kind,
    quantityDeltaBags: row.quantity_delta_bags,
    sourceType: row.source_type,
    note: row.note,
    createdAt: row.created_at,
  }))
}

export async function listStockCounts(
  client: InventoryClient,
  limit = 30,
): Promise<StockCountItem[]> {
  const { data, error } = await client
    .from('stock_counts')
    .select(
      'id, operating_day, expected_bags, actual_bags, variance_bags, variance_pct, warning_pct, requires_review, note, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Không thể tải lịch sử kiểm kho.')
  return data.map(normalizeStockCountRow)
}

export function normalizeStockCountRow(row: Pick<
  StockCountRow,
  | 'id'
  | 'operating_day'
  | 'expected_bags'
  | 'actual_bags'
  | 'variance_bags'
  | 'variance_pct'
  | 'warning_pct'
  | 'requires_review'
  | 'note'
  | 'created_at'
>): StockCountItem {
  if (row.variance_bags === null) {
    throw new Error('Dữ liệu kiểm kho không hợp lệ.')
  }
  return {
    id: row.id,
    operatingDay: row.operating_day,
    expectedBags: row.expected_bags,
    actualBags: row.actual_bags,
    varianceBags: row.variance_bags,
    variancePct: row.variance_pct,
    warningPct: row.warning_pct,
    requiresReview: row.requires_review,
    note: row.note,
    createdAt: row.created_at,
  }
}
