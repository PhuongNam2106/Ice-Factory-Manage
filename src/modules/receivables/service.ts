import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import { recordReceiptRecord, type ReceivablesClient } from './repository'
import { recordReceiptSchema, type RecordReceiptInput } from './schema'
import type { RecordReceiptResult } from './types'

const recordReceiptResultSchema = z.object({ receiptId: z.string().uuid() })

function mapReceiptError(message: string): ActionResult<never> {
  if (message.includes('CUTOVER_NOT_CONFIGURED')) {
    return actionFailure('CUTOVER_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình thời điểm bắt đầu vận hành. Vui lòng báo quản lý.')
  }
  if (message.includes('OCCURRED_AT_BEFORE_CUTOVER')) {
    return actionFailure('OCCURRED_AT_BEFORE_CUTOVER', 'Thời gian thu tiền phải từ thời điểm bắt đầu vận hành hệ thống trở đi.')
  }
  if (message.includes('ALLOCATIONS_EXCEED_RECEIPT_AMOUNT')) {
    return actionFailure('ALLOCATIONS_EXCEED_RECEIPT_AMOUNT', 'Tổng số tiền phân bổ vượt quá số tiền phiếu thu.')
  }
  if (message.includes('ALLOCATION_EXCEEDS_OUTSTANDING')) {
    return actionFailure('ALLOCATION_EXCEEDS_OUTSTANDING', 'Số tiền phân bổ vượt quá dư nợ của khoản nợ.')
  }
  if (message.includes('OPEN_RECEIVABLE_NOT_FOUND')) {
    return actionFailure('RECEIVABLE_NOT_FOUND', 'Không tìm thấy khoản nợ cần phân bổ.')
  }
  if (message.includes('DAY_LOCKED')) {
    return actionFailure('DAY_LOCKED', 'Ngày vận hành đã khóa, không thể ghi nhận phiếu thu.')
  }
  if (message.includes('ACTIVE_CUSTOMER_NOT_FOUND')) {
    return actionFailure('CUSTOMER_NOT_FOUND', 'Khách hàng không tồn tại hoặc đã ngừng hoạt động.')
  }
  return actionFailure('RECORD_RECEIPT_FAILED', 'Không thể ghi nhận phiếu thu. Vui lòng thử lại.')
}

export async function recordReceiptWithClient(
  input: RecordReceiptInput,
  client?: ReceivablesClient,
): Promise<ActionResult<RecordReceiptResult>> {
  const parsed = recordReceiptSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_ERROR',
      'Thông tin phiếu thu không hợp lệ.',
      getFieldErrors(parsed.error),
    )
  }

  const supabase = client ?? (await createServerSupabaseClient())

  const { data, error } = await recordReceiptRecord(supabase, parsed.data)
  if (error) return mapReceiptError(error.message)

  const result = recordReceiptResultSchema.safeParse(data)
  if (!result.success) {
    return actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả phiếu thu không hợp lệ.')
  }

  return actionSuccess(result.data)
}
