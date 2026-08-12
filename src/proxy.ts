import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import {
  createSessionRedirectResponse,
  getProxyDecision,
} from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const path = request.nextUrl.pathname
  const userId = data?.claims?.sub
  let isActive = false

  if (path === '/login' && typeof userId === 'string') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', userId)
      .maybeSingle()
    isActive = profile?.is_active === true
  }

  const decision = getProxyDecision({
    isActive,
    isAuthenticated: typeof userId === 'string',
    pathname: path,
  })

  if (decision === 'redirect-login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return createSessionRedirectResponse(request, url, response)
  }

  if (decision === 'redirect-home') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return createSessionRedirectResponse(request, url, response)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
