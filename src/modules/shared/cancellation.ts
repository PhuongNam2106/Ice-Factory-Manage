import 'server-only'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { cancelDocumentSchema, type CancelDocumentInput } from './version-conflict'

export type CancelDocumentResult = { entityType: CancelDocumentInput['entityType']; entityId: string; version: number }
const resultSchema = z.object({ entityType: z.enum(['sale', 'receipt', 'production_batch', 'production_shift_total', 'expense']), entityId: z.uuid(), version: z.int().positive() })

export async function cancelDocumentWithClient(input: CancelDocumentInput, client?: SupabaseClient<Database>): Promise<ActionResult<CancelDocumentResult>> {
  const parsed = cancelDocumentSchema.safeParse(input)
  if (!parsed.success) return actionFailure('VALIDATION_ERROR', 'Cần nhập lý do hủy từ 5 đến 500 ký tự.')
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await db.rpc('cancel_document', {
    p_entity_type: parsed.data.entityType,
    p_entity_id: parsed.data.entityId,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  })
  if (error) {
    if (error.message.includes('VERSION_CONFLICT')) return actionFailure('VERSION_CONFLICT', 'Chứng từ đã thay đổi. Hãy tải lại trang trước khi hủy.')
    if (error.message.includes('DAY_LOCKED')) return actionFailure('DAY_LOCKED', 'Ngày vận hành đã khóa, không thể hủy chứng từ.')
    if (error.message.includes('FORBIDDEN')) return actionFailure('FORBIDDEN', 'Bạn chỉ được hủy chứng từ do mình tạo; quản lý có thể hủy mọi chứng từ.')
    if (error.message.includes('later receipts')) return actionFailure('INVALID_STATE', 'Đơn bán đã có khoản thu nợ sau đó. Hãy hủy hoặc phân bổ lại phiếu thu trước.')
    if (error.message.includes('source sale')) return actionFailure('INVALID_STATE', 'Phiếu thu lúc bán phải được hủy cùng đơn bán.')
    if (error.message.includes('INVALID_STATE')) return actionFailure('INVALID_STATE', 'Chứng từ không còn ở trạng thái có thể hủy.')
    return actionFailure('CANCELLATION_FAILED', 'Không thể hủy chứng từ. Vui lòng thử lại.')
  }
  const result = resultSchema.safeParse(data)
  return result.success ? actionSuccess(result.data) : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả không hợp lệ.')
}
