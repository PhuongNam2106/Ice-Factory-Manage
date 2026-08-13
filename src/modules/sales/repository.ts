import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { CreateSale } from './schema'
import type { SaleListItem } from './types'

export type SalesClient = Pick<SupabaseClient<Database>, 'from' | 'rpc'>

export async function createSaleRecord(client: SalesClient, sale: CreateSale) {
  return client.rpc('create_sale', {
    p_idempotency_key: sale.idempotencyKey,
    p_input: sale as unknown as Json,
  })
}

export async function listSalesByDay(
  client: SalesClient,
  operatingDay: string,
): Promise<SaleListItem[]> {
  const { data, error } = await client
    .from('sales')
    .select(
      'id, kind, operating_day, shift_code, total_vnd, paid_now_vnd, status, created_at, customers(name)',
    )
    .eq('operating_day', operatingDay)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Không thể tải danh sách bán hàng.')

  return data.map((sale) => ({
    id: sale.id,
    kind: sale.kind,
    operatingDay: sale.operating_day,
    customerName: sale.customers?.name ?? null,
    shiftCode: sale.shift_code,
    totalVnd: sale.total_vnd,
    paidNowVnd: sale.paid_now_vnd,
    status: sale.status,
    createdAt: sale.created_at,
  }))
}
