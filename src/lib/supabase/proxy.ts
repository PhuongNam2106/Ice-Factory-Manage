import { NextResponse, type NextRequest } from 'next/server'

export type ProxyDecision = 'allow' | 'redirect-home' | 'redirect-login'

export function getProxyDecision({
  isActive,
  isAuthenticated,
  pathname,
}: {
  isActive: boolean
  isAuthenticated: boolean
  pathname: string
}): ProxyDecision {
  if (!isAuthenticated && pathname !== '/login') return 'redirect-login'
  if (isAuthenticated && isActive && pathname === '/login') return 'redirect-home'
  return 'allow'
}

export function createSessionRedirectResponse(
  _request: NextRequest,
  destination: URL,
  sessionResponse: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(destination)

  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })

  return redirectResponse
}
