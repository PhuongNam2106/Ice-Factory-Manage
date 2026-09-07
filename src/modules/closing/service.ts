import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getDailyReconciliationRecord,
  lockOperatingDayRecord,
  reopenOperatingDayRecord,
  type ClosingClient,
} from './repository'
import type { ClosingCheck, ClosingCheckInput, DailyReconciliation } from './types'

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const checkSchema = z.object({
  code: z.enum([
    'MISSING_LOSS_REPORT', 'PREVIOUS_DAY_NOT_READY', 'PENDING_HARVEST_QUANTITY',
    'LOSS_REPORT_STALE', 'LOSS_REVIEW_REQUIRED', 'OPEN_MACHINE_RUNS',
    'PENDING_EXPENSES', 'UNNAMED_CREDIT_SALES', 'INVALID_DOCUMENTS',
  ]),
  blocking: z.boolean(),
  overridable: z.boolean(),
  message: z.string(),
})
const reconciliationSchema = z.object({
  day: z.string(),
  status: z.enum(['open', 'locked']),
  snapshotVersion: z.number().int().nonnegative(),
  lossWarningPct: z.coerce.number(),
  lossReportId: z.string().uuid().nullable(),
  lossReportVersion: z.coerce.number().int().positive().nullable(),
  totals: z.object({
    wholesaleRevenueVnd: z.coerce.number(), retailRevenueVnd: z.coerce.number(),
    revenueVnd: z.coerce.number(), soldBags: z.coerce.number(), collectedVnd: z.coerce.number(),
    newDebtVnd: z.coerce.number(), productionBags: z.coerce.number(),
    approvedExpenseVnd: z.coerce.number(), pendingExpenseVnd: z.coerce.number(),
    openingBags: z.coerce.number().nullable(), expectedClosingBags: z.coerce.number().nullable(),
    closingBags: z.coerce.number().nullable(), differenceBags: z.coerce.number().nullable(),
    differencePct: z.coerce.number().nullable(),
  }),
  checks: z.array(checkSchema),
  overrideReason: z.string().nullable().optional(),
})

export function evaluateClosingChecks(input: ClosingCheckInput): ClosingCheck[] {
  const checks: ClosingCheck[] = []
  if (!input.lossReportExists) checks.push({ code: 'MISSING_LOSS_REPORT', blocking: true, overridable: false, message: 'Chưa nhập tồn cuối và lưu đối soát hao hụt' })
  if (!input.previousDayReady) checks.push({ code: 'PREVIOUS_DAY_NOT_READY', blocking: true, overridable: false, message: 'Ngày trước chưa khóa nên chưa xác định được tồn đầu' })
  if (input.pendingHarvestCount > 0) checks.push({ code: 'PENDING_HARVEST_QUANTITY', blocking: true, overridable: false, message: `Còn ${input.pendingHarvestCount} lần xả đá chưa nhập số bao` })
  if (input.lossReportStale) checks.push({ code: 'LOSS_REPORT_STALE', blocking: true, overridable: false, message: 'Số liệu sản xuất hoặc bán hàng đã thay đổi sau lần đối soát' })
  if (input.lossRequiresReview && !input.lossWarningConfirmed) checks.push({ code: 'LOSS_REVIEW_REQUIRED', blocking: true, overridable: false, message: 'Chênh lệch hao hụt vượt ngưỡng và chưa được quản lý xác nhận' })
  if ((input.openMachineRunCount ?? 0) > 0) checks.push({ code: 'OPEN_MACHINE_RUNS', blocking: true, overridable: false, message: `Còn ${input.openMachineRunCount} máy chưa tắt` })
  if (input.pendingExpenseCount > 0) checks.push({ code: 'PENDING_EXPENSES', blocking: true, overridable: false, message: 'Còn chi phí chờ duyệt' })
  if (input.unnamedCreditSaleCount > 0) checks.push({ code: 'UNNAMED_CREDIT_SALES', blocking: true, overridable: false, message: 'Bán chịu thiếu khách hàng' })
  if (input.invalidDocumentCount > 0) checks.push({ code: 'INVALID_DOCUMENTS', blocking: true, overridable: false, message: 'Chứng từ thiếu dữ liệu' })
  return checks
}

function mapError(message: string): ActionResult<never> {
  if (message.includes('CLOSING_BLOCKED')) return actionFailure('CLOSING_BLOCKED', 'Ngày còn lỗi bắt buộc phải xử lý trước khi khóa.')
  if (message.includes('LOSS_REPORT_STALE')) return actionFailure('LOSS_REPORT_STALE', 'Số liệu sản xuất hoặc bán hàng vừa thay đổi. Hãy lưu lại đối soát hao hụt trước khi khóa.')
  if (message.includes('CUTOVER_NOT_CONFIGURED')) return actionFailure('CUTOVER_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình ngày bắt đầu đối soát hao hụt.')
  if (message.includes('REOPEN_REASON_REQUIRED')) return actionFailure('REOPEN_REASON_REQUIRED', 'Cần nhập lý do mở lại ngày.')
  if (message.includes('INVALID_STATE')) return actionFailure('INVALID_STATE', 'Trạng thái ngày vận hành đã thay đổi.')
  if (message.includes('FORBIDDEN')) return actionFailure('FORBIDDEN', 'Chỉ quản lý được thực hiện thao tác này.')
  return actionFailure('CLOSING_FAILED', 'Không thể xử lý khóa sổ. Vui lòng thử lại.')
}

function parseResult(data: unknown): ActionResult<DailyReconciliation> {
  const parsed = reconciliationSchema.safeParse(data)
  return parsed.success ? actionSuccess(parsed.data) : actionFailure('INVALID_SERVER_RESPONSE', 'Dữ liệu đối chiếu không hợp lệ.')
}

export async function getDailyReconciliation(day: string, client?: ClosingClient) {
  if (!daySchema.safeParse(day).success) return actionFailure('VALIDATION_ERROR', 'Ngày không hợp lệ.')
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await getDailyReconciliationRecord(db, day)
  return error ? mapError(error.message) : parseResult(data)
}

export async function lockOperatingDay(day: string, client?: ClosingClient) {
  if (!daySchema.safeParse(day).success) return actionFailure('VALIDATION_ERROR', 'Ngày không hợp lệ.')
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await lockOperatingDayRecord(db, day)
  return error ? mapError(error.message) : parseResult(data)
}

export async function reopenOperatingDay(day: string, reason: string, client?: ClosingClient) {
  if (!daySchema.safeParse(day).success || !reason.trim()) return actionFailure('VALIDATION_ERROR', 'Ngày hoặc lý do không hợp lệ.')
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await reopenOperatingDayRecord(db, day, reason)
  if (error) return mapError(error.message)
  return actionSuccess(data)
}
