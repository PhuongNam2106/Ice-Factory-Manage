import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signInWithPassword } from './actions'
import { loginSchema, usernameToAuthEmail, userCreateSchema } from './schema'
import { requireManager, requireUser } from './service'

const createServerSupabaseClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient }))

const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`redirect:${path}`)
}))

vi.mock('next/navigation', () => ({ redirect }))

describe('loginSchema', () => {
  it('normalizes a username and accepts a six-digit numeric password', () => {
    expect(loginSchema.parse({ username: ' QuanLy ', password: '123456' })).toEqual({
      username: 'quanly',
      password: '123456',
    })
  })

  it('rejects a username containing Vietnamese characters or spaces', () => {
    expect(() => loginSchema.parse({ username: 'nhân viên', password: '123456' })).toThrow()
  })

  it('rejects a password containing non-numeric characters', () => {
    expect(() => loginSchema.parse({ username: 'nv1', password: '12345a' })).toThrow()
  })

  it('maps a normalized username to the internal Auth email', () => {
    expect(usernameToAuthEmail('quanly')).toBe(
      'quanly@account.icefactory.invalid',
    )
  })
})

describe('userCreateSchema', () => {
  it('accepts an empty optional contact phone as null', () => {
    expect(userCreateSchema.parse({
      username: 'nhanvien01',
      phone: '',
      password: '123456',
      fullName: 'Nhân viên 01',
      role: 'employee',
    }).phone).toBeNull()
  })
})

describe('signInWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('authenticates the normalized username through its internal email', async () => {
    const supabaseSignIn = vi.fn().mockResolvedValue({
      data: { user: { id: '30d8b4cc-53d8-4ffb-b8c7-7d0ca980dd80' } },
      error: null,
    })
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        signInWithPassword: supabaseSignIn,
        signOut: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_active: true },
              error: null,
            }),
          }),
        }),
      }),
    })

    await expect(signInWithPassword({
      username: ' QuanLy ',
      password: '123456',
    })).resolves.toEqual({ ok: true, data: undefined })
    expect(supabaseSignIn).toHaveBeenCalledWith({
      email: 'quanly@account.icefactory.invalid',
      password: '123456',
    })
  })

  it('returns one generic error for rejected credentials', async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'user not found' },
        }),
      },
    })

    await expect(signInWithPassword({
      username: 'khongtontai',
      password: '123456',
    })).resolves.toEqual({
      ok: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Tên tài khoản hoặc mật khẩu không đúng.',
      },
    })
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

  it('sends an inactive manager through the session-clearing route', async () => {
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
                full_name: 'Quản lý ngừng hoạt động',
                role: 'manager',
                is_active: false,
              },
              error: null,
            }),
          }),
        }),
      }),
    })

    await expect(requireManager()).rejects.toThrow('redirect:/auth/inactive')
  })
})

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends an inactive signed-in account through the session-clearing route', async () => {
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
                full_name: 'Tài khoản ngừng hoạt động',
                role: 'employee',
                is_active: false,
              },
              error: null,
            }),
          }),
        }),
      }),
    })

    await expect(requireUser()).rejects.toThrow('redirect:/auth/inactive')
  })
})
