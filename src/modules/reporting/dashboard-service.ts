import type { DailyDashboard, DashboardRow, OperationalAlert } from './types'
import { getOperationalAlerts } from './alerts'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getDashboardRow, hasRecentSaleOutlier, type ReportingClient } from './repository'

export function buildRevenueKpis(input: { wholesaleVnd: number; retailVnd: number }) {
  return { ...input, totalVnd: input.wholesaleVnd + input.retailVnd }
}

export function buildDashboard(input: {
  revenueVnd: number
  approvedExpenseVnd: number
  pendingExpenseVnd: number
}) {
  return {
    ...input,
    officialProfitVnd: input.revenueVnd - input.approvedExpenseVnd,
  }
}

export function assembleDailyDashboard(
  row: DashboardRow,
  alerts: OperationalAlert[] = getOperationalAlerts({
    stockVariancePct: row.stockVariancePct,
    stockWarningPct: row.stockWarningPct,
    stockBalanceBags: row.stockBalanceBags,
    overdueDebtVnd: row.overdueDebtVnd,
    pendingExpenseCount: row.pendingExpenseCount,
    productionMismatchCount: row.productionMismatchCount,
    previousDayUnlocked: row.previousDayUnlocked,
    hasOutlier: false,
  }),
): DailyDashboard {
  const revenueVnd = row.wholesaleRevenueVnd + row.retailRevenueVnd
  return {
    ...row,
    revenueVnd,
    officialProfitVnd: revenueVnd - row.approvedExpenseVnd,
    alerts,
  }
}

export async function getDailyDashboard(day: string, client?: ReportingClient): Promise<DailyDashboard> {
  const db = client ?? (await createServerSupabaseClient())
  await ensureOperatingDay(day, db)
  const [row, hasOutlier] = await Promise.all([
    getDashboardRow(db, day),
    hasRecentSaleOutlier(db),
  ])
  return assembleDailyDashboard(row, getOperationalAlerts({
    stockVariancePct: row.stockVariancePct,
    stockWarningPct: row.stockWarningPct,
    stockBalanceBags: row.stockBalanceBags,
    overdueDebtVnd: row.overdueDebtVnd,
    pendingExpenseCount: row.pendingExpenseCount,
    productionMismatchCount: row.productionMismatchCount,
    previousDayUnlocked: row.previousDayUnlocked,
    hasOutlier,
  }))
}
