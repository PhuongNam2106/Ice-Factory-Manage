import { NextRequest, NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'
import {
  createSessionRedirectResponse,
  getProxyDecision,
} from './proxy'

describe('getProxyDecision', () => {
  it('allows the login page for a session whose profile is inactive', () => {
    expect(
      getProxyDecision({ isActive: false, isAuthenticated: true, pathname: '/login' }),
    ).toBe('allow')
  })
})

describe('createSessionRedirectResponse', () => {
  it('retains refreshed cookies when redirecting an unauthenticated app request', () => {
    const request = new NextRequest('http://localhost/sales')
    const sessionResponse = NextResponse.next({ request })
    sessionResponse.cookies.set('sb-refresh', 'renewed')

    const response = createSessionRedirectResponse(
      request,
      new URL('/login', request.url),
      sessionResponse,
    )

    expect(response.headers.get('location')).toBe('http://localhost/login')
    expect(response.cookies.get('sb-refresh')?.value).toBe('renewed')
  })

  it('retains refreshed cookies when redirecting an active session away from login', () => {
    const request = new NextRequest('http://localhost/login')
    const sessionResponse = NextResponse.next({ request })
    sessionResponse.cookies.set('sb-refresh', 'renewed')

    const response = createSessionRedirectResponse(
      request,
      new URL('/', request.url),
      sessionResponse,
    )

    expect(response.headers.get('location')).toBe('http://localhost/')
    expect(response.cookies.get('sb-refresh')?.value).toBe('renewed')
  })
})
