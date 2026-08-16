import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getPublicEnv } from '@/lib/env'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'
import { parseHealthCredentials } from '@/modules/health/schema'

export const dynamic = 'force-dynamic'

function response(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

export async function POST(request: Request) {
  const credentials = parseHealthCredentials(await request.json().catch(() => null))
  if (!credentials) return response({ ok: false }, 400)

  const env = getPublicEnv()
  const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  try {
    const signedIn = await client.auth.signInWithPassword({
      email: usernameToAuthEmail(credentials.username),
      password: credentials.password,
    })
    if (signedIn.error) return response({ ok: false }, 401)
    const settings = await client.from('settings').select('id').limit(1)
    if (settings.error || settings.data.length !== 1) return response({ ok: false }, 503)
    return response({ ok: true, backendHost: new URL(env.NEXT_PUBLIC_SUPABASE_URL).host }, 200)
  } finally {
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
  }
}
