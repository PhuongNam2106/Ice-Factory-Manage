import { describe, expect, it, vi } from 'vitest'
import { createUserWithAdmin, setUserActiveWithAdmin } from './service'

vi.mock('@/lib/supabase/admin', () => ({ adminClient: {} }))

describe('createUserWithAdmin', () => {
  it('removes the Auth user if creating its profile fails', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'aa024448-d9d3-4d54-a763-1a6b1d9fa2c1' } },
            error: null,
          }),
          deleteUser,
          updateUserById: vi.fn(),
        },
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'duplicate profile' },
        }),
      }),
    }

    await expect(
      createUserWithAdmin(admin, {
        phone: '+84912345678',
        pin: '123456',
        fullName: 'Nhân viên mới',
        role: 'employee',
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'CREATE_USER_FAILED',
        message: 'Không thể tạo tài khoản. Vui lòng thử lại.',
      },
    })

    expect(deleteUser).toHaveBeenCalledWith('aa024448-d9d3-4d54-a763-1a6b1d9fa2c1')
  })

  it('reports an operational reconciliation error if profile compensation fails', async () => {
    const admin = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'aa024448-d9d3-4d54-a763-1a6b1d9fa2c1' } },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
          updateUserById: vi.fn(),
        },
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: 'duplicate profile' } }),
      }),
    }

    await expect(
      createUserWithAdmin(admin, {
        phone: '+84912345678',
        pin: '123456',
        fullName: 'Nhân viên mới',
        role: 'employee',
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'USER_RECONCILIATION_REQUIRED',
        message: 'Không thể hoàn tác tài khoản đã tạo. Liên hệ quản trị viên để đối soát.',
      },
    })
  })
})

describe('setUserActiveWithAdmin', () => {
  it('rejects a request that does not update exactly one profile', async () => {
    const admin = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }

    await expect(
      setUserActiveWithAdmin(admin, {
        isActive: false,
        userId: 'aa024448-d9d3-4d54-a763-1a6b1d9fa2c1',
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản để cập nhật.',
      },
    })
  })
})
