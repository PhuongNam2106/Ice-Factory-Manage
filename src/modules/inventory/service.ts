import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { recordStockCountRecord, type InventoryClient } from './repository'
import { stockCountSchema, type StockCountInput } from './schema'
import type { StockCountResult } from './types'

const stockCountResultSchema = z.object({
  countId: z.string().uuid(),
  varianceBags: z.string(),
  variancePct: z.string().nullable(),
  requiresReview: z.boolean(),
})

function mapInventoryError(message: string): ActionResult<never> {
  if (message.includes('DAY_LOCKED')) {
    return actionFailure('DAY_LOCKED', 'Ngày vận hành đã khóa.')
  }
  return actionFailure('STOCK_COUNT_FAILED', 'Không thể lưu kiểm kho. Vui lòng thử lại.')
}

export async function recordStockCountWithClient(
  input: StockCountInput,
  client?: InventoryClient,
): Promise<ActionResult<StockCountResult>> {
  const parsed = stockCountSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_ERROR',
      'Thông tin kiểm kho không hợp lệ.',
      getFieldErrors(parsed.error),
    )
  }

  const db = client ?? (await createServerSupabaseClient())
  try {
    await ensureOperatingDay(parsed.data.operatingDay, db)
  } catch {
    return actionFailure('OPERATING_DAY_FAILED', 'Không thể khởi tạo ngày vận hành.')
  }

  const { data, error } = await recordStockCountRecord(db, parsed.data)
  if (error) return mapInventoryError(error.message)
  const result = stockCountResultSchema.safeParse(data)
  return result.success
    ? actionSuccess(result.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả kiểm kho không hợp lệ.')
}
