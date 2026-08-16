import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { AttachmentMetadata, CreateExpense, ReviewExpense } from './schema'
import type {
  ExpenseAttachmentItem,
  ExpenseCategoryItem,
  ExpenseItem,
} from './types'

export type ExpenseClient = SupabaseClient<Database>

export function createExpenseRecord(client: ExpenseClient, input: CreateExpense) {
  const payload = { ...input } as Omit<CreateExpense, 'idempotencyKey'> & {
    idempotencyKey?: string
  }
  delete payload.idempotencyKey
  return client.rpc('create_expense', {
    p_input: payload as unknown as Json,
    p_idempotency_key: input.idempotencyKey,
  })
}

export function reviewExpenseRecord(client: ExpenseClient, input: ReviewExpense) {
  return client.rpc('review_expense', {
    p_expense_id: input.expenseId,
    p_decision: input.decision,
    p_reason: input.reason ?? undefined,
  })
}

export function finalizeAttachmentRecord(
  client: ExpenseClient,
  input: AttachmentMetadata & { objectPath: string },
) {
  return client.rpc('finalize_expense_attachment', {
    p_expense_id: input.expenseId,
    p_object_path: input.objectPath,
    p_original_name: input.fileName,
    p_content_type: input.contentType,
    p_size_bytes: input.sizeBytes,
  })
}

export async function listExpenseCategories(
  client: ExpenseClient,
): Promise<ExpenseCategoryItem[]> {
  const { data, error } = await client
    .from('expense_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error('Không thể tải danh mục chi phí.')
  return data
}

export async function listExpenses(client: ExpenseClient, limit = 100): Promise<ExpenseItem[]> {
  const { data, error } = await client
    .from('expenses')
    .select(
      'id, operating_day, category_id, amount_vnd, payee, note, status, version, review_reason, created_by, created_at, reviewed_by, reviewed_at, expense_categories(name), expense_attachments(id, expense_id, original_name, content_type, size_bytes, created_at)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Không thể tải danh sách chi phí.')

  return data.map((row) => ({
    id: row.id,
    operatingDay: row.operating_day,
    categoryId: row.category_id,
    categoryName: row.expense_categories.name,
    amountVnd: Number(row.amount_vnd),
    payee: row.payee,
    note: row.note,
    status: row.status,
    version: row.version,
    reviewReason: row.review_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    attachments: row.expense_attachments.map((attachment) => ({
      id: attachment.id,
      expenseId: attachment.expense_id,
      originalName: attachment.original_name,
      contentType: attachment.content_type,
      sizeBytes: Number(attachment.size_bytes),
      createdAt: attachment.created_at,
    })),
  }))
}

export async function listExpenseAttachments(
  client: ExpenseClient,
  expenseId: string,
): Promise<ExpenseAttachmentItem[]> {
  const { data, error } = await client
    .from('expense_attachments')
    .select('id, expense_id, original_name, content_type, size_bytes, created_at')
    .eq('expense_id', expenseId)
    .order('created_at')
  if (error) throw new Error('Không thể tải chứng từ chi phí.')
  return data.map((row) => ({
    id: row.id,
    expenseId: row.expense_id,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
  }))
}
