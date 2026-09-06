import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const correctOccurredAtSchema = z.object({
  entityType: z.enum(['sale', 'receipt', 'expense']),
  entityId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  occurredAt: z.iso.datetime({ offset: true }),
  idempotencyKey: z.string().uuid(),
})

export type CorrectOccurredAtInput = z.input<typeof correctOccurredAtSchema>
export type CorrectOccurredAt = z.output<typeof correctOccurredAtSchema>

export type CorrectOccurredAtResult = {
  entityType: CorrectOccurredAt['entityType']
  entityId: string
  operatingDay: string
  occurredAt: string
  version: number
}

type DocumentTimeClient = {
  rpc: (
    name: 'correct_document_occurred_at',
    args: {
      p_entity_type: string
      p_entity_id: string
      p_expected_version: number
      p_occurred_at: string
      p_idempotency_key: string
    },
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}

const resultSchema = z.object({
  entityType: z.enum(['sale', 'receipt', 'expense']),
  entityId: z.string().uuid(),
  operatingDay: z.iso.date(),
  occurredAt: z.iso.datetime({ offset: true }),
  version: z.number().int().positive(),
})

function mapError(message: string): ActionResult<never> {
  if (message.includes('DAY_LOCKED')) {
    return actionFailure('DAY_LOCKED', 'Ngày phát sinh cũ hoặc mới đã khóa, không thể sửa thời gian.')
  }
  if (message.includes('VERSION_CONFLICT')) {
    return actionFailure('VERSION_CONFLICT', 'Chứng từ vừa được thay đổi. Vui lòng tải lại trang.')
  }
  if (message.includes('OCCURRED_AT_BEFORE_CUTOVER')) {
    return actionFailure('OCCURRED_AT_BEFORE_CUTOVER', 'Thời gian này nằm trước mốc áp dụng ngày vận hành mới.')
  }
  if (message.includes('FORBIDDEN')) {
    return actionFailure('FORBIDDEN', 'Bạn chỉ được sửa chứng từ do mình tạo; quản lý có thể sửa mọi chứng từ.')
  }
  return actionFailure('CORRECT_OCCURRED_AT_FAILED', 'Không thể sửa thời gian chứng từ. Vui lòng thử lại.')
}

export async function correctDocumentOccurredAtWithClient(
  input: CorrectOccurredAtInput,
  client?: DocumentTimeClient,
): Promise<ActionResult<CorrectOccurredAtResult>> {
  const parsed = correctOccurredAtSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thời gian phát sinh không hợp lệ.')
  }

  const db = client ?? (await createServerSupabaseClient() as unknown as DocumentTimeClient)
  const { data, error } = await db.rpc('correct_document_occurred_at', {
    p_entity_type: parsed.data.entityType,
    p_entity_id: parsed.data.entityId,
    p_expected_version: parsed.data.expectedVersion,
    p_occurred_at: parsed.data.occurredAt,
    p_idempotency_key: parsed.data.idempotencyKey,
  })
  if (error) return mapError(error.message)

  const result = resultSchema.safeParse(data)
  return result.success
    ? actionSuccess(result.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả không hợp lệ.')
}
