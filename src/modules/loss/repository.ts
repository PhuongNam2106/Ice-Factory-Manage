import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import { getOperatingDay } from '@/modules/shared/operating-day'
import type {
  ConfirmDailyLossWarning,
  DailyLoss,
} from './schema'
import type {
  DailyLossHistoryItem,
  DailyLossVersionItem,
  IncompleteLossDayWorkspace,
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

export async function listIncompleteLossDays(
  client: LossClient,
  currentDay: string,
  limit = 60,
): Promise<IncompleteLossDayWorkspace> {
  const { data: settings, error: settingsError } = await client
    .from('settings')
    .select('operating_day_cutover_at')
    .eq('id', true)
    .single()
  if (settingsError || !settings.operating_day_cutover_at) {
    throw new Error('Không thể xác định ngày bắt đầu đối soát hao hụt.')
  }

  const firstOperatingDay = getOperatingDay(new Date(settings.operating_day_cutover_at))
  const { data, error } = await client
    .from('daily_dashboard')
    .select('day, status, loss_report_exists, loss_report_stale, loss_requires_review, pending_harvest_count')
    .gte('day', firstOperatingDay)
    .lte('day', currentDay)
    .order('day', { ascending: true })
    .limit(Math.max(limit, 366))
  if (error) throw new Error('Không thể tải các ngày đối soát chưa hoàn tất.')

  const rows = data.some((row) => row.day === currentDay)
    ? data
    : [...data, {
        day: currentDay,
        status: 'open' as const,
        loss_report_exists: false,
        loss_report_stale: false,
        loss_requires_review: false,
        pending_harvest_count: 0,
      }]

  return {
    firstOperatingDay,
    days: rows
      .filter((row) => row.day && row.status === 'open')
      .sort((left, right) => left.day!.localeCompare(right.day!))
      .slice(0, limit)
      .map((row) => ({
        operatingDay: row.day!,
        hasReport: Boolean(row.loss_report_exists),
        isStale: Boolean(row.loss_report_stale),
        requiresReview: Boolean(row.loss_requires_review),
        pendingHarvestCount: Number(row.pending_harvest_count),
      })),
  }
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
