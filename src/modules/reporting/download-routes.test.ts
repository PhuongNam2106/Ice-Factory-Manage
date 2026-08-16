import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createServerSupabaseClient } = vi.hoisted(() => ({ createServerSupabaseClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient }))

import { createBackupRoute, createDetailReportRoute } from './download-routes'

function authClient(role: 'employee' | 'manager' | null) {
  return {
    auth: { getClaims: vi.fn(async () => role ? { data: { claims: { sub: 'user-1' } }, error: null } : { data: null, error: new Error('no session') }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: role ? { id: 'user-1', username: 'nhanvien', phone: null, full_name: 'Nhân viên', role, is_active: true } : null, error: null })) })),
      })),
    })),
  }
}

describe('report download authorization', () => {
  beforeEach(() => createServerSupabaseClient.mockReset())

  it('returns 401 without a signed-in user', async () => {
    createServerSupabaseClient.mockResolvedValue(authClient(null))
    const response = await createDetailReportRoute('sales')(new NextRequest('http://localhost/api/reports/sales?from=2026-08-01&to=2026-08-16'))

    expect(response.status).toBe(401)
  })

  it('prevents employees from downloading audit and backup data', async () => {
    createServerSupabaseClient.mockResolvedValue(authClient('employee'))
    const audit = await createDetailReportRoute('audit')(new NextRequest('http://localhost/api/reports/audit?from=2026-08-01&to=2026-08-16'))
    const backup = await createBackupRoute()()

    expect(audit.status).toBe(403)
    expect(backup.status).toBe(403)
  })
})
