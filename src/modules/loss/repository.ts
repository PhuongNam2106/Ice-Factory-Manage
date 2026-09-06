import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type {
  ConfirmDailyLossWarning,
  DailyLoss,
} from './schema'
import type {
  DailyLossHistoryItem,
  DailyLossVersionItem,
} from './types'

export type LossClient = SupabaseClient<Database>

export function getDailyLossReportRecord(client: LossClient, day: string) {
  return client.rpc('get_daily_loss_report', { p_day: day })
}

export function saveDailyLossRecord(client: LossClient, input: DailyLoss) {
  return client.rpc('save_daily_loss_report', {
    p_input: {
      operatingDay: input.operatingDay,
      openingBags: input.openingBags,
      closingBags: input.closingBags,
      note: input.note,
      expectedVersion: input.expectedVersion,
    } as Json,
    p_idempotency_key: input.idempotencyKey,
  })
}

export function confirmDailyLossWarningRecord(
  client: LossClient,
  input: ConfirmDailyLossWarning,
) {
  return client.rpc('confirm_daily_loss_warning', {
    p_report_id: input.reportId,
    p_expected_version: input.expectedVersion,
  })
}

export async function listDailyLossReports(
  client: LossClient,
  limit = 60,
): Promise<DailyLossHistoryItem[]> {
  const { data, error } = await client
    .from('daily_loss_reports')
    .select('id, operating_day, opening_bags, produced_bags, sold_bags, closing_bags, difference_bags, difference_pct, classification, requires_review, warning_confirmed_at, version, updated_at')
    .order('operating_day', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Không thể tải lịch sử hao hụt.')

  return data.map((row) => ({
    id: row.id,
    operatingDay: row.operating_day,
    openingBags: Number(row.opening_bags),
    producedBags: Number(row.produced_bags),
    soldBags: Number(row.sold_bags),
    closingBags: Number(row.closing_bags),
    differenceBags: Number(row.difference_bags),
    differencePct: row.difference_pct == null ? null : Number(row.difference_pct).toFixed(3),
    classification: row.classification,
    requiresReview: row.requires_review,
    warningConfirmedAt: row.warning_confirmed_at,
    version: row.version,
    updatedAt: row.updated_at,
  }))
}

export async function listDailyLossReportVersions(
  client: LossClient,
  reportId: string,
): Promise<DailyLossVersionItem[]> {
  const { data, error } = await client
    .from('daily_loss_report_versions')
    .select('version, snapshot, created_at, editor:profiles!daily_loss_report_versions_created_by_fkey(full_name)')
    .eq('report_id', reportId)
    .order('version', { ascending: false })
  if (error) throw new Error('Không thể tải lịch sử chỉnh sửa hao hụt.')

  return data.map((row) => ({
    version: row.version,
    snapshot: row.snapshot,
    createdAt: row.created_at,
    editorName: row.editor.full_name,
  }))
}
