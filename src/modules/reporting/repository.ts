import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { detectOutlier } from './alerts'
import type { DashboardRow } from './types'

export type ReportingClient = SupabaseClient<Database>

export async function getDashboardRow(client: ReportingClient, day: string): Promise<DashboardRow> {
  const { data, error } = await client.from('daily_dashboard').select('*').eq('day', day).single()
  if (error) throw new Error(`Không thể tải dashboard: ${error.message}`)
  return {
    day: data.day!, status: data.status!,
    wholesaleRevenueVnd: Number(data.wholesale_revenue_vnd),
    retailRevenueVnd: Number(data.retail_revenue_vnd),
    collectedVnd: Number(data.collected_vnd), newDebtVnd: Number(data.new_debt_vnd),
    totalDebtVnd: Number(data.total_debt_vnd), productionBags: Number(data.production_bags),
    soldBags: Number(data.sold_bags),
    openingBags: data.opening_bags == null ? null : Number(data.opening_bags),
    expectedClosingBags: data.expected_closing_bags == null ? null : Number(data.expected_closing_bags),
    closingBags: data.closing_bags == null ? null : Number(data.closing_bags),
    differenceBags: data.difference_bags == null ? null : Number(data.difference_bags),
    differencePct: data.difference_pct == null ? null : Number(data.difference_pct),
    lossClassification: data.loss_classification,
    lossRequiresReview: Boolean(data.loss_requires_review),
    lossReportStale: Boolean(data.loss_report_stale),
    lossReportExists: Boolean(data.loss_report_exists),
    lossWarningPct: Number(data.loss_warning_pct),
    pendingHarvestCount: Number(data.pending_harvest_count),
    approvedExpenseVnd: Number(data.approved_expense_vnd), pendingExpenseVnd: Number(data.pending_expense_vnd),
    pendingExpenseCount: Number(data.pending_expense_count), overdueDebtVnd: Number(data.overdue_debt_vnd),
    previousDayUnlocked: Boolean(data.previous_day_unlocked),
  }
}

export async function hasRecentSaleOutlier(client: ReportingClient): Promise<boolean> {
  const { data, error } = await client.from('sale_lines')
    .select('quantity_bags, unit_price_vnd, sales!inner(created_at)')
    .eq('sales.status', 'active')
    .order('created_at', { ascending: false, referencedTable: 'sales' })
    .limit(31)
  if (error) throw new Error('Không thể kiểm tra giá trị bất thường.')
  if (data.length < 3) return false
  const [current, ...previous] = data
  return detectOutlier(Number(current.quantity_bags), previous.map((line) => Number(line.quantity_bags)))
    || detectOutlier(Number(current.unit_price_vnd), previous.map((line) => Number(line.unit_price_vnd)))
}
