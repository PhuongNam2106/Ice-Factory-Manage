import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { createSaleRecord, type SalesClient } from './repository'
import { createSaleSchema, type CreateSaleInput } from './schema'
import type { CreateSaleResult } from './types'

const createSaleResultSchema = z.object({ saleId: z.string().uuid() })

function mapSaleError(message: string): ActionResult<never> {
  if (message.includes('INSUFFICIENT_STOCK')) {
    return actionFailure('INSUFFICIENT_STOCK', 'Không đủ tồn kho thành phẩm để bán số bao này.')
  }
  if (message.includes('DAY_LOCKED')) {
    return actionFailure('DAY_LOCKED', 'Ngày vận hành đã khóa, không thể ghi thêm bán hàng.')
  }
  if (message.includes('sales_active_retail_shift_key')) {
    return actionFailure('RETAIL_SHIFT_EXISTS', 'Ca bán lẻ này đã có bản tổng hợp trong ngày.')
  }
  if (message.includes('ACTIVE_CUSTOMER_NOT_FOUND')) {
    return actionFailure('CUSTOMER_NOT_FOUND', 'Khách hàng không tồn tại hoặc đã ngừng hoạt động.')
  }
  if (message.includes('RETAIL_MUST_BE_FULLY_PAID')) {
    return actionFailure('RETAIL_MUST_BE_FULLY_PAID', 'Bán lẻ phải thu đủ 100% tổng tiền.')
  }
  return actionFailure('CREATE_SALE_FAILED', 'Không thể lưu giao dịch bán hàng. Vui lòng thử lại.')
}

export async function createSaleWithClient(
  input: CreateSaleInput,
  client?: SalesClient,
): Promise<ActionResult<CreateSaleResult>> {
  const parsed = createSaleSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_ERROR',
      'Thông tin bán hàng không hợp lệ.',
      getFieldErrors(parsed.error),
    )
  }

  const supabase = client ?? (await createServerSupabaseClient())

  try {
    await ensureOperatingDay(parsed.data.operatingDay, supabase)
  } catch {
    return actionFailure('OPERATING_DAY_FAILED', 'Không thể khởi tạo ngày vận hành.')
  }

  const { data, error } = await createSaleRecord(supabase, parsed.data)
  if (error) return mapSaleError(error.message)

  const result = createSaleResultSchema.safeParse(data)
  if (!result.success) {
    return actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả bán hàng không hợp lệ.')
  }

  return actionSuccess(result.data)
}
