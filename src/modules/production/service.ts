import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import {
  createProductionBatchRecord,
  createProductionShiftTotalRecord,
  selectProductionSourceRecord,
  type ProductionClient,
} from './repository'
import {
  productionBatchSchema,
  productionShiftTotalSchema,
  selectProductionSourceSchema,
  type ProductionBatchInput,
  type ProductionBatch,
  type ProductionShiftTotalInput,
  type ProductionShiftTotal,
  type SelectProductionSourceInput,
  type SelectProductionSource,
} from './schema'
import type { ProductionBatchResult, ProductionShiftTotalResult, ProductionSourceSelectionResult } from './types'

function mapProductionError(message: string): ActionResult<never> {
  if (message.includes('DAY_LOCKED')) return actionFailure('DAY_LOCKED', 'Ngày vận hành đã khóa.')
  if (message.includes('FORBIDDEN')) return actionFailure('MANAGER_REQUIRED', 'Chỉ quản lý được xác nhận nguồn sản lượng chính thức.')
  if (message.includes('ACTIVE_MACHINE_NOT_FOUND')) return actionFailure('MACHINE_NOT_FOUND', 'Máy không tồn tại hoặc đã ngừng hoạt động.')
  if (message.includes('PRODUCTION_SHIFT_TOTAL_NOT_FOUND')) return actionFailure('SOURCE_NOT_FOUND', 'Chưa có tổng cuối ca để chọn.')
  if (message.includes('PRODUCTION_BATCHES_NOT_FOUND')) return actionFailure('SOURCE_NOT_FOUND', 'Chưa có dữ liệu từng mẻ để chọn.')
  return actionFailure('PRODUCTION_WRITE_FAILED', 'Không thể lưu dữ liệu sản xuất. Vui lòng thử lại.')
}

async function runWrite<TInput, TParsed extends { operatingDay: string }, TOutput>(options: {
  input: TInput
  schema: z.ZodType<TParsed, TInput>
  resultSchema: z.ZodType<TOutput>
  client?: ProductionClient
  write: (client: ProductionClient, input: TParsed) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}): Promise<ActionResult<TOutput>> {
  const parsed = options.schema.safeParse(options.input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin sản xuất không hợp lệ.', getFieldErrors(parsed.error))
  }
  const client = options.client ?? (await createServerSupabaseClient())
  try {
    await ensureOperatingDay(parsed.data.operatingDay, client)
  } catch {
    return actionFailure('OPERATING_DAY_FAILED', 'Không thể khởi tạo ngày vận hành.')
  }
  const { data, error } = await options.write(client, parsed.data)
  if (error) return mapProductionError(error.message)
  const result = options.resultSchema.safeParse(data)
  return result.success
    ? actionSuccess(result.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về dữ liệu sản xuất không hợp lệ.')
}

export function createProductionBatchWithClient(input: ProductionBatchInput, client?: ProductionClient) {
  return runWrite<ProductionBatchInput, ProductionBatch, ProductionBatchResult>({
    input, client, schema: productionBatchSchema,
    resultSchema: z.object({ batchId: z.string().uuid() }),
    write: (c, value) => createProductionBatchRecord(c, value),
  })
}

export function createProductionShiftTotalWithClient(input: ProductionShiftTotalInput, client?: ProductionClient) {
  return runWrite<ProductionShiftTotalInput, ProductionShiftTotal, ProductionShiftTotalResult>({
    input, client, schema: productionShiftTotalSchema,
    resultSchema: z.object({ shiftTotalId: z.string().uuid() }),
    write: (c, value) => createProductionShiftTotalRecord(c, value),
  })
}

export function selectOfficialProductionSourceWithClient(input: SelectProductionSourceInput, client?: ProductionClient) {
  return runWrite<SelectProductionSourceInput, SelectProductionSource, ProductionSourceSelectionResult>({
    input, client, schema: selectProductionSourceSchema,
    resultSchema: z.object({ selectionId: z.string().uuid() }),
    write: (c, value) => selectProductionSourceRecord(c, value),
  })
}
