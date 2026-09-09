import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import { createSaleRecord, type SalesClient } from './repository'
import { createSaleSchema, type CreateSaleInput } from './schema'
import type { CreateSaleResult } from './types'

const createSaleResultSchema = z.discriminatedUnion('kind', [
  z.object({
    saleId: z.string().uuid(),
    kind: z.literal('wholesale'),
    unitPriceVnd: z.number().int().positive(),
    totalVnd: z.number().int().nonnegative(),
    usedHistoricalPrice: z.boolean(),
  }),
  z.object({
    saleId: z.string().uuid(),
    kind: z.literal('retail'),
    unitPriceVnd: z.null(),
    totalVnd: z.number().int().nonnegative(),
    usedHistoricalPrice: z.literal(false),
  }),
])

function mapSaleError(message: string): ActionResult<never> {
  if (message.includes('CUTOVER_NOT_CONFIGURED')) {
    return actionFailure('CUTOVER_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình thời điểm bắt đầu vận hành. Vui lòng báo quản lý.')
  }
  if (message.includes('OCCURRED_AT_BEFORE_CUTOVER')) {
    return actionFailure('OCCURRED_AT_BEFORE_CUTOVER', 'Thời gian bán hàng phải từ thời điểm bắt đầu vận hành hệ thống trở đi.')
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
  if (message.includes('WHOLESALE_CUSTOMER_REQUIRED')) {
    return actionFailure('WHOLESALE_CUSTOMER_REQUIRED', 'Khách hàng là bắt buộc đối với đơn bán sỉ.')
  }
  if (message.includes('CUSTOMER_WHOLESALE_PRICE_MISSING')) {
    return actionFailure('CUSTOMER_WHOLESALE_PRICE_MISSING', 'Khách hàng chưa được thiết lập giá sỉ.')
  }
  if (message.includes('INVALID_WHOLESALE_PRICE')) {
    return actionFailure('INVALID_WHOLESALE_PRICE', 'Giá sỉ không hợp lệ.')
  }
  if (message.includes('HISTORICAL_WHOLESALE_PRICE_REQUIRED')) {
    return actionFailure(
      'HISTORICAL_WHOLESALE_PRICE_REQUIRED',
      'Giá sỉ thực tế là bắt buộc khi nhập bù đơn bán sỉ của ngày cũ.',
    )
  }
  if (message.includes('HISTORICAL_WHOLESALE_PRICE_FORBIDDEN')) {
    return actionFailure(
      'HISTORICAL_WHOLESALE_PRICE_FORBIDDEN',
      'Chỉ quản lý mới được nhập giá sỉ thực tế cho ngày cũ.',
    )
  }
  if (message.includes('HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED')) {
    return actionFailure(
      'HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED',
      'Giá sỉ thực tế chỉ được dùng khi nhập bù ngày cũ.',
    )
  }
  if (message.includes('PAID_AMOUNT_EXCEEDS_TOTAL')) {
    return actionFailure('PAID_AMOUNT_EXCEEDS_TOTAL', 'Tiền nhận ngay không được vượt tổng tiền của đơn bán sỉ.')
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

  const { data, error } = await createSaleRecord(supabase, parsed.data)
  if (error) return mapSaleError(error.message)

  const result = createSaleResultSchema.safeParse(data)
  if (!result.success) {
    return actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về kết quả bán hàng không hợp lệ.')
  }

  return actionSuccess(result.data)
}
