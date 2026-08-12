import { describe, expect, it, vi } from 'vitest'
import { createUserWithAdmin } from './actions'

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
      success: false,
      error: 'Không thể tạo tài khoản. Vui lòng thử lại.',
    })

    expect(deleteUser).toHaveBeenCalledWith('aa024448-d9d3-4d54-a763-1a6b1d9fa2c1')
  })
})
