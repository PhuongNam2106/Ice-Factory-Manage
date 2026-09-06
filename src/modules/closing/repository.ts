import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type ClosingClient = SupabaseClient<Database>

export function getDailyReconciliationRecord(client: ClosingClient, day: string) {
  return client.rpc('get_daily_reconciliation', { p_day: day })
}

export function lockOperatingDayRecord(client: ClosingClient, day: string) {
  return client.rpc('lock_operating_day', { p_day: day })
}

export function reopenOperatingDayRecord(client: ClosingClient, day: string, reason: string) {
  return client.rpc('reopen_operating_day', { p_day: day, p_reason: reason })
}

export async function listOperatingDays(client: ClosingClient, limit = 31) {
  const { data, error } = await client
    .from('operating_days')
    .select('day, status, snapshot_version, locked_at, reopened_at')
    .order('day', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Không thể tải danh sách ngày vận hành.')
  return data
}
