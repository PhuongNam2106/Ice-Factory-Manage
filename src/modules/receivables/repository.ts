import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { RecordReceipt } from './schema'
import type { CustomerDebtSummary, ReceivableListItem, ReceiptListItem } from './types'

export type ReceivablesClient = Pick<SupabaseClient<Database>, 'from' | 'rpc'>

export async function recordReceiptRecord(client: ReceivablesClient, receipt: RecordReceipt) {
  return client.rpc('record_receipt', {
    p_idempotency_key: receipt.idempotencyKey,
    p_input: receipt as unknown as Json,
  })
}

export async function listCustomerDebtSummaries(
  client: ReceivablesClient,
  today: string,
): Promise<CustomerDebtSummary[]> {
  const { data: receivablesData, error: recError } = await client
    .from('receivables')
    .select('id, customer_id, outstanding_amount_vnd, due_date, status, customers(name, phone)')
    .eq('status', 'open')

  if (recError) throw new Error('Không thể tải danh sách công nợ khách hàng.')

  const customerMap = new Map<string, CustomerDebtSummary>()

  for (const item of receivablesData) {
    const custId = item.customer_id
    const custName = item.customers?.name ?? 'Khách hàng vô danh'
    const custPhone = item.customers?.phone ?? null
    const amount = Number(item.outstanding_amount_vnd)
    const isOverdue = item.due_date < today

    const existing = customerMap.get(custId) ?? {
      customerId: custId,
      customerName: custName,
      customerPhone: custPhone,
      totalOutstandingVnd: 0,
      overdueVnd: 0,
      oldestDueDate: null,
      openReceivablesCount: 0,
    }

    existing.totalOutstandingVnd += amount
    if (isOverdue) {
      existing.overdueVnd += amount
    }
    existing.openReceivablesCount += 1
    if (!existing.oldestDueDate || item.due_date < existing.oldestDueDate) {
      existing.oldestDueDate = item.due_date
    }

    customerMap.set(custId, existing)
  }

  return Array.from(customerMap.values()).sort(
    (a, b) => b.totalOutstandingVnd - a.totalOutstandingVnd,
  )
}

export async function listOpenReceivablesByCustomer(
  client: ReceivablesClient,
  customerId: string,
): Promise<ReceivableListItem[]> {
  const { data, error } = await client
    .from('receivables')
    .select(
      'id, sale_id, customer_id, operating_day, original_amount_vnd, outstanding_amount_vnd, due_date, status, created_at, customers(name)',
    )
    .eq('customer_id', customerId)
    .eq('status', 'open')
    .order('due_date', { ascending: true })

  if (error) throw new Error('Không thể tải danh sách khoản nợ của khách hàng.')

  return data.map((item) => ({
    id: item.id,
    saleId: item.sale_id,
    customerId: item.customer_id,
    customerName: item.customers?.name ?? 'Khách hàng',
    operatingDay: item.operating_day,
    originalAmountVnd: Number(item.original_amount_vnd),
    outstandingAmountVnd: Number(item.outstanding_amount_vnd),
    dueDate: item.due_date,
    status: item.status as 'open' | 'paid' | 'cancelled',
    createdAt: item.created_at,
  }))
}

export async function listReceiptsByCustomer(
  client: ReceivablesClient,
  customerId: string,
): Promise<ReceiptListItem[]> {
  const { data, error } = await client
    .from('receipts')
    .select(
      'id, customer_id, operating_day, amount_vnd, payment_method, note, status, version, created_by, source_sale_id, created_at, customers(name)',
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Không thể tải lịch sử phiếu thu.')

  return data.map((item) => ({
    id: item.id,
    customerId: item.customer_id,
    customerName: item.customers?.name ?? null,
    operatingDay: item.operating_day,
    amountVnd: Number(item.amount_vnd),
    paymentMethod: item.payment_method,
    note: item.note,
    status: item.status,
    version: item.version,
    createdBy: item.created_by,
    sourceSaleId: item.source_sale_id,
    createdAt: item.created_at,
  }))
}
