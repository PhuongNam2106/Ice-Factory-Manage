import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database, Json } from '@/lib/supabase/database.types'

const secretKey = /(password|passcode|pin|token|secret|authorization|cookie)/i

export function sanitizeAuditData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditData)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretKey.test(key) ? '[REDACTED]' : sanitizeAuditData(item)]))
  }
  return value
}

export type AuditFilters = { actor?: string; from?: string; to?: string; entity?: string; action?: string }
export type AuditItem = {
  id: string; createdAt: string; actorId: string; actorName: string; entityType: string; entityId: string
  action: string; reason: string | null; before: unknown; after: unknown
}

export function normalizeActorFilter(value: string): string | null {
  const parsed = z.uuid().safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function listAuditEvents(client: SupabaseClient<Database>, filters: AuditFilters, limit = 200): Promise<AuditItem[]> {
  const actor = filters.actor ? normalizeActorFilter(filters.actor) : null
  if (filters.actor && !actor) return []
  let query = client.from('audit_log').select('id, created_at, actor_id, entity_type, entity_id, action, reason, before_data, after_data, profiles!audit_log_actor_id_fkey(full_name, username)').order('created_at', { ascending: false }).limit(limit)
  if (actor) query = query.eq('actor_id', actor)
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00+07:00`)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999+07:00`)
  if (filters.entity) query = query.eq('entity_type', filters.entity)
  if (filters.action) query = query.eq('action', filters.action)
  const { data, error } = await query
  if (error) throw new Error('Không thể tải lịch sử audit.')
  return data.map((row) => ({
    id: row.id, createdAt: row.created_at, actorId: row.actor_id,
    actorName: row.profiles?.full_name ?? row.profiles?.username ?? row.actor_id,
    entityType: row.entity_type, entityId: row.entity_id, action: row.action, reason: row.reason,
    before: sanitizeAuditData(row.before_data as Json | null), after: sanitizeAuditData(row.after_data as Json | null),
  }))
}
