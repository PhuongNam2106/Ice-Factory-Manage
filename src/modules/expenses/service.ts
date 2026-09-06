import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import {
  createExpenseRecord,
  finalizeAttachmentRecord,
  reviewExpenseRecord,
  type ExpenseClient,
} from './repository'
import {
  attachmentMetadataSchema,
  createExpenseSchema,
  reviewExpenseSchema,
  type AttachmentMetadataInput,
  type CreateExpenseInput,
  type ReviewExpenseInput,
} from './schema'
import type {
  CreateAttachmentUploadResult,
  CreateExpenseResult,
  FinalizeAttachmentResult,
  ReviewExpenseResult,
} from './types'

const createResultSchema = z.object({ expenseId: z.string().uuid() })
const reviewResultSchema = z.object({
  expenseId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
})
const finalizeResultSchema = z.object({ attachmentId: z.string().uuid() })

function mapExpenseError(message: string): ActionResult<never> {
  if (message.includes('CUTOVER_NOT_CONFIGURED')) {
    return actionFailure('CUTOVER_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình thời điểm bắt đầu vận hành. Vui lòng báo quản lý.')
  }
  if (message.includes('OCCURRED_AT_BEFORE_CUTOVER')) {
    return actionFailure('OCCURRED_AT_BEFORE_CUTOVER', 'Thời gian chi phí phải từ thời điểm bắt đầu vận hành hệ thống trở đi.')
  }
  if (message.includes('DAY_LOCKED')) {
    return actionFailure('DAY_LOCKED', 'Ngày vận hành đã khóa.')
  }
  if (message.includes('FORBIDDEN')) {
    return actionFailure('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
  }
  if (message.includes('INVALID_STATE')) {
    return actionFailure('INVALID_STATE', 'Khoản chi đã được xử lý trước đó.')
  }
  if (message.includes('ATTACHMENT_UPLOAD_NOT_FOUND')) {
    return actionFailure('UPLOAD_NOT_FOUND', 'Không tìm thấy tệp vừa tải lên.')
  }
  return actionFailure('EXPENSE_FAILED', 'Không thể xử lý chi phí. Vui lòng thử lại.')
}

export async function createExpenseWithClient(
  input: CreateExpenseInput,
  client?: ExpenseClient,
): Promise<ActionResult<CreateExpenseResult>> {
  const parsed = createExpenseSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin chi phí không hợp lệ.', getFieldErrors(parsed.error))
  }
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await createExpenseRecord(db, parsed.data)
  if (error) return mapExpenseError(error.message)
  const result = createResultSchema.safeParse(data)
  return result.success
    ? actionSuccess(result.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả không hợp lệ.')
}

export async function reviewExpenseWithClient(
  input: ReviewExpenseInput,
  client?: ExpenseClient,
): Promise<ActionResult<ReviewExpenseResult>> {
  const parsed = reviewExpenseSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin duyệt không hợp lệ.', getFieldErrors(parsed.error))
  }
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await reviewExpenseRecord(db, parsed.data)
  if (error) return mapExpenseError(error.message)
  const result = reviewResultSchema.safeParse(data)
  return result.success
    ? actionSuccess(result.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả không hợp lệ.')
}

export async function createAttachmentUploadWithClient(
  input: AttachmentMetadataInput,
  client?: ExpenseClient,
): Promise<ActionResult<CreateAttachmentUploadResult>> {
  const parsed = attachmentMetadataSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Tệp phải là JPEG, PNG hoặc PDF và không quá 10 MB.')
  }
  const db = client ?? (await createServerSupabaseClient())
  const { data: expense, error: expenseError } = await db
    .from('expenses')
    .select('operating_day')
    .eq('id', parsed.data.expenseId)
    .single()
  if (expenseError) return mapExpenseError(expenseError.message)

  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf',
  }[parsed.data.contentType]
  const objectPath = `${expense.operating_day}/${parsed.data.expenseId}/${crypto.randomUUID()}.${extension}`
  const { data, error } = await db.storage
    .from('expense-receipts')
    .createSignedUploadUrl(objectPath)
  if (error) return mapExpenseError(error.message)
  return actionSuccess({ objectPath, signedUrl: data.signedUrl, token: data.token })
}

export async function finalizeAttachmentWithClient(
  input: AttachmentMetadataInput & { objectPath: string },
  client?: ExpenseClient,
): Promise<ActionResult<FinalizeAttachmentResult>> {
  const parsed = attachmentMetadataSchema.safeParse(input)
  if (!parsed.success || !input.objectPath) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin chứng từ không hợp lệ.')
  }
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await finalizeAttachmentRecord(db, {
    ...parsed.data,
    objectPath: input.objectPath,
  })
  if (error) return mapExpenseError(error.message)
  const result = finalizeResultSchema.safeParse(data)
  return result.success
    ? actionSuccess(result.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả không hợp lệ.')
}

export async function getAttachmentUrlWithClient(
  attachmentId: string,
  client?: ExpenseClient,
): Promise<ActionResult<{ signedUrl: string }>> {
  if (!z.string().uuid().safeParse(attachmentId).success) {
    return actionFailure('VALIDATION_ERROR', 'Mã chứng từ không hợp lệ.')
  }
  const db = client ?? (await createServerSupabaseClient())
  const { data: attachment, error: attachmentError } = await db
    .from('expense_attachments')
    .select('object_path')
    .eq('id', attachmentId)
    .single()
  if (attachmentError) return mapExpenseError(attachmentError.message)
  const { data, error } = await db.storage
    .from('expense-receipts')
    .createSignedUrl(attachment.object_path, 300)
  if (error) return mapExpenseError(error.message)
  return actionSuccess({ signedUrl: data.signedUrl })
}
