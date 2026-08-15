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
    'MISSING_STOCK_COUNT', 'PENDING_EXPENSES', 'UNNAMED_CREDIT_SALES',
    'INVALID_PRODUCTION_SOURCE', 'INVALID_DOCUMENTS', 'STOCK_VARIANCE',
  ]),
  blocking: z.boolean(),
  overridable: z.boolean(),
  message: z.string(),
})
const reconciliationSchema = z.object({
  day: z.string(),
  status: z.enum(['open', 'locked']),
  snapshotVersion: z.number().int().nonnegative(),
  stockWarningPct: z.coerce.number(),
  totals: z.object({
    wholesaleRevenueVnd: z.coerce.number(), retailRevenueVnd: z.coerce.number(),
    revenueVnd: z.coerce.number(), soldBags: z.coerce.number(), collectedVnd: z.coerce.number(),
    newDebtVnd: z.coerce.number(), productionBags: z.coerce.number(),
    approvedExpenseVnd: z.coerce.number(), pendingExpenseVnd: z.coerce.number(),
    stockExpectedBags: z.coerce.number().nullable(), stockActualBags: z.coerce.number().nullable(),
    stockVarianceBags: z.coerce.number().nullable(), stockVariancePct: z.coerce.number().nullable(),
  }),
  checks: z.array(checkSchema),
  overrideReason: z.string().nullable().optional(),
})

export function evaluateClosingChecks(input: ClosingCheckInput): ClosingCheck[] {
  const checks: ClosingCheck[] = []
  if (!input.stockCountExists) checks.push({ code: 'MISSING_STOCK_COUNT', blocking: true, overridable: false, message: 'Chưa có kiểm kho cuối ngày' })
  if (input.pendingExpenseCount > 0) checks.push({ code: 'PENDING_EXPENSES', blocking: true, overridable: false, message: 'Còn chi phí chờ duyệt' })
  if (input.unnamedCreditSaleCount > 0) checks.push({ code: 'UNNAMED_CREDIT_SALES', blocking: true, overridable: false, message: 'Bán chịu thiếu khách hàng' })
  if (input.invalidProductionSourceCount > 0) checks.push({ code: 'INVALID_PRODUCTION_SOURCE', blocking: true, overridable: false, message: 'Nguồn sản xuất chưa xác nhận' })
  if (input.invalidDocumentCount > 0) checks.push({ code: 'INVALID_DOCUMENTS', blocking: true, overridable: false, message: 'Chứng từ thiếu dữ liệu' })
  if (input.stockVariancePct === null || input.stockVariancePct > input.stockWarningPct) checks.push({ code: 'STOCK_VARIANCE', blocking: true, overridable: true, message: 'Chênh lệch tồn vượt ngưỡng' })
  return checks
}

function mapError(message: string): ActionResult<never> {
  if (message.includes('CLOSING_BLOCKED')) return actionFailure('CLOSING_BLOCKED', 'Ngày còn lỗi bắt buộc phải xử lý trước khi khóa.')
  if (message.includes('VARIANCE_OVERRIDE_REASON_REQUIRED')) return actionFailure('OVERRIDE_REASON_REQUIRED', 'Cần nhập lý do chấp nhận chênh lệch tồn.')
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

export async function lockOperatingDay(day: string, reason?: string | null, client?: ClosingClient) {
  if (!daySchema.safeParse(day).success) return actionFailure('VALIDATION_ERROR', 'Ngày không hợp lệ.')
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await lockOperatingDayRecord(db, day, reason)
  return error ? mapError(error.message) : parseResult(data)
}

export async function reopenOperatingDay(day: string, reason: string, client?: ClosingClient) {
  if (!daySchema.safeParse(day).success || !reason.trim()) return actionFailure('VALIDATION_ERROR', 'Ngày hoặc lý do không hợp lệ.')
  const db = client ?? (await createServerSupabaseClient())
  const { data, error } = await reopenOperatingDayRecord(db, day, reason)
  if (error) return mapError(error.message)
  return actionSuccess(data)
}
