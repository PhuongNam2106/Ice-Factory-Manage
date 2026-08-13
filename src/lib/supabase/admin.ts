import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'
import type { Database } from './database.types'

export function createAdminClient() {
  const env = getEnv()
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

export const adminClient = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_target, prop, receiver) {
    const client = createAdminClient()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
