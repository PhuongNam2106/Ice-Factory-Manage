import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import {
  confirmDailyLossWarningRecord,
  getDailyLossReportRecord,
  saveDailyLossRecord,
  type LossClient,
} from './repository'
import {
  confirmDailyLossWarningSchema,
  dailyLossDaySchema,
  dailyLossInputSchema,
  type ConfirmDailyLossWarningInput,
  type DailyLossInput,
} from './schema'
import type { DailyLossReport } from './types'

const reportSchema: z.ZodType<DailyLossReport> = z.object({
  id: z.string().uuid().nullable(),
  operatingDay: dailyLossDaySchema,
  openingBags: z.number().int().nonnegative().nullable(),
  producedBags: z.number().int().nonnegative(),
  soldBags: z.number().int().nonnegative(),
  expectedClosingBags: z.number().int().nullable(),
  closingBags: z.number().int().nonnegative().nullable(),
  differenceBags: z.number().int().nullable(),
  differencePct: z.string().nullable(),
  classification: z.enum(['matched', 'loss', 'surplus', 'no_production']).nullable(),
  warningPct: z.string(),
  requiresReview: z.boolean(),
  warningConfirmedAt: z.string().nullable(),
  version: z.number().int().positive().nullable(),
  isStale: z.boolean(),
  pendingHarvestCount: z.number().int().nonnegative(),
  previousDayReady: z.boolean(),
  canFinalize: z.boolean(),
  status: z.enum(['open', 'locked']),
  note: z.string().nullable(),
})

const errorMessages = {
  CUTOVER_NOT_CONFIGURED: 'Hệ thống chưa được cấu hình thời điểm bắt đầu vận hành. Vui lòng báo quản lý.',
  DAY_LOCKED: 'Ngày vận hành đã khóa.',
  PREVIOUS_DAY_NOT_READY: 'Ngày trước chưa khóa nên chưa xác định được tồn đầu.',
  OPENING_BAGS_REQUIRED: 'Ngày đầu tiên cần nhập tồn đầu thủ công.',
  OPENING_BAGS_DERIVED: 'Tồn đầu đã được kế thừa từ ngày trước và không thể nhập khác.',
  VERSION_CONFLICT: 'Kết quả vừa được người khác cập nhật. Vui lòng tải lại.',
  LOSS_REPORT_STALE: 'Số liệu sản xuất hoặc bán hàng đã thay đổi. Vui lòng kiểm tra và lưu lại.',
  PENDING_HARVEST_QUANTITY: 'Còn lần xả đá chưa nhập số bao.',
  WARNING_NOT_REQUIRED: 'Báo cáo này không có cảnh báo cần xác nhận.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
} as const

export function mapDailyLossError(message: string): ActionResult<never> {
  const entry = Object.entries(errorMessages).find(([code]) => message.includes(code))
  return entry
    ? actionFailure(entry[0], entry[1])
    : actionFailure('DAILY_LOSS_FAILED', 'Không thể xử lý báo cáo hao hụt. Vui lòng thử lại.')
}

async function parseReport(
  request: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<ActionResult<DailyLossReport>> {
  const { data, error } = await request
  if (error) return mapDailyLossError(error.message)
  const parsed = reportSchema.safeParse(data)
  return parsed.success
    ? actionSuccess(parsed.data)
    : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về báo cáo hao hụt không hợp lệ.')
}

async function clientOrDefault(client?: LossClient) {
  return client ?? await createServerSupabaseClient()
}

export async function getDailyLossReport(
  day: string,
  client?: LossClient,
): Promise<ActionResult<DailyLossReport>> {
  const parsed = dailyLossDaySchema.safeParse(day)
  if (!parsed.success) return actionFailure('VALIDATION_ERROR', 'Ngày vận hành không hợp lệ.')
  return parseReport(getDailyLossReportRecord(await clientOrDefault(client), parsed.data))
}

export async function saveDailyLoss(
  input: DailyLossInput,
  client?: LossClient,
): Promise<ActionResult<DailyLossReport>> {
  const parsed = dailyLossInputSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_ERROR',
      'Thông tin đối soát hao hụt không hợp lệ.',
      getFieldErrors(parsed.error),
    )
  }
  return parseReport(saveDailyLossRecord(await clientOrDefault(client), parsed.data))
}

export async function confirmDailyLossWarning(
  input: ConfirmDailyLossWarningInput,
  client?: LossClient,
): Promise<ActionResult<DailyLossReport>> {
  const parsed = confirmDailyLossWarningSchema.safeParse(input)
  if (!parsed.success) return actionFailure('VALIDATION_ERROR', 'Thông tin xác nhận cảnh báo không hợp lệ.')
  return parseReport(confirmDailyLossWarningRecord(await clientOrDefault(client), parsed.data))
}
