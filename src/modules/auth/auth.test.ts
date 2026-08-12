import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginSchema } from './schema'
import { requireManager } from './service'

const createServerSupabaseClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient }))

describe('loginSchema', () => {
  it('normalizes a Vietnamese phone and accepts a six-digit PIN', () => {
    expect(loginSchema.parse({ phone: '0912 345 678', pin: '123456' })).toEqual({
      phone: '+84912345678',
      pin: '123456',
    })
  })

  it('rejects a short PIN', () => {
    expect(() => loginSchema.parse({ phone: '0912345678', pin: '1234' })).toThrow()
  })
})

describe('requireManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an authenticated employee before a manager action can run', async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: '30d8b4cc-53d8-4ffb-b8c7-7d0ca980dd80' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: '30d8b4cc-53d8-4ffb-b8c7-7d0ca980dd80',
                phone: '+84912345678',
                full_name: 'Nhân viên',
                role: 'employee',
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    })

    await expect(requireManager()).rejects.toThrow('Không có quyền quản lý')
  })
})
