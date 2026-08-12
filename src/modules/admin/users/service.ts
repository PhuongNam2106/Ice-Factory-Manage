import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { usernameToAuthEmail } from '@/modules/auth/schema'

export type AdminSupabaseClient = Pick<SupabaseClient<Database>, 'from'> & {
  auth: {
    admin: {
      createUser: (input: {
        email: string
        password: string
        email_confirm: boolean
      }) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>
      deleteUser: (id: string) => Promise<{ error: { message: string } | null }>
      updateUserById: (
        id: string,
        input: { password?: string },
      ) => Promise<{ error: { message: string } | null }>
    }
  }
}

type PasswordAdminClient = {
  auth: {
    admin: Pick<AdminSupabaseClient['auth']['admin'], 'updateUserById'>
  }
}

export type CreateUserInput = {
  username: string
  phone: string | null
  password: string
  fullName: string
  role: 'employee' | 'manager'
}

export async function createUserWithAdmin(
  client: AdminSupabaseClient,
  input: CreateUserInput,
): Promise<ActionResult<void>> {
  const { data, error } = await client.auth.admin.createUser({
    email: usernameToAuthEmail(input.username),
    password: input.password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return actionFailure('CREATE_USER_FAILED', 'Không thể tạo tài khoản. Vui lòng thử lại.')
  }

  const { error: profileError } = await client.from('profiles').insert({
    id: data.user.id,
    username: input.username,
    phone: input.phone,
    full_name: input.fullName,
    role: input.role,
    is_active: true,
  })

  if (profileError) {
    try {
      const { error: deleteError } = await client.auth.admin.deleteUser(data.user.id)
      if (deleteError) {
        return actionFailure(
          'USER_RECONCILIATION_REQUIRED',
          'Không thể hoàn tác tài khoản đã tạo. Liên hệ quản trị viên để đối soát.',
        )
      }
    } catch {
      return actionFailure(
        'USER_RECONCILIATION_REQUIRED',
        'Không thể hoàn tác tài khoản đã tạo. Liên hệ quản trị viên để đối soát.',
      )
    }

    return actionFailure('CREATE_USER_FAILED', 'Không thể tạo tài khoản. Vui lòng thử lại.')
  }

  return actionSuccess(undefined)
}

export async function setUserActiveWithAdmin(
  client: Pick<AdminSupabaseClient, 'from'>,
  input: { userId: string; isActive: boolean },
): Promise<ActionResult<void>> {
  const { data, error } = await client
    .from('profiles')
    .update({ is_active: input.isActive })
    .eq('id', input.userId)
    .select('id')

  if (error) {
    return actionFailure('UPDATE_USER_FAILED', 'Không thể cập nhật trạng thái tài khoản.')
  }
  if (data.length !== 1) {
    return actionFailure('USER_NOT_FOUND', 'Không tìm thấy tài khoản để cập nhật.')
  }
  return actionSuccess(undefined)
}

export async function resetUserPasswordWithAdmin(
  client: PasswordAdminClient,
  input: { userId: string; password: string },
): Promise<ActionResult<void>> {
  const { error } = await client.auth.admin.updateUserById(input.userId, {
    password: input.password,
  })

  if (error) {
    return actionFailure('RESET_PASSWORD_FAILED', 'Không thể đặt lại mật khẩu.')
  }
  return actionSuccess(undefined)
}
