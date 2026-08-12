'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/database.types'
import { requireManager } from '@/modules/auth/service'
import {
  userActiveSchema,
  userCreateSchema,
  userPinResetSchema,
} from '@/modules/auth/schema'
import type { ActionResult } from '@/modules/auth/actions'

type AdminSupabaseClient = Pick<SupabaseClient<Database>, 'from'> & {
  auth: {
    admin: {
      createUser: (input: {
        phone: string
        password: string
        phone_confirm: boolean
      }) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>
      deleteUser: (id: string) => Promise<unknown>
      updateUserById: (
        id: string,
        input: { password?: string },
      ) => Promise<{ error: { message: string } | null }>
    }
  }
}

type CreateUserInput = {
  phone: string
  pin: string
  fullName: string
  role: 'employee' | 'manager'
}

export async function createUserWithAdmin(
  client: AdminSupabaseClient,
  input: CreateUserInput,
): Promise<ActionResult<void>> {
  const { data, error } = await client.auth.admin.createUser({
    phone: input.phone,
    password: input.pin,
    phone_confirm: true,
  })

  if (error || !data.user) {
    return { success: false, error: 'Không thể tạo tài khoản. Vui lòng thử lại.' }
  }

  const { error: profileError } = await client.from('profiles').insert({
    id: data.user.id,
    phone: input.phone,
    full_name: input.fullName,
    role: input.role,
    is_active: true,
  })

  if (profileError) {
    await client.auth.admin.deleteUser(data.user.id)
    return { success: false, error: 'Không thể tạo tài khoản. Vui lòng thử lại.' }
  }

  return { success: true, data: undefined }
}

export async function createUser(input: CreateUserInput): Promise<ActionResult<void>> {
  try {
    await requireManager()
  } catch {
    return { success: false, error: 'Không có quyền quản lý.' }
  }

  const parsed = userCreateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Thông tin tài khoản không hợp lệ.' }
  }

  const result = await createUserWithAdmin(adminClient, parsed.data)
  if (result.success) revalidatePath('/admin/users')
  return result
}

export async function resetUserPin(input: {
  userId: string
  pin: string
}): Promise<ActionResult<void>> {
  try {
    await requireManager()
  } catch {
    return { success: false, error: 'Không có quyền quản lý.' }
  }

  const parsed = userPinResetSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Mã PIN không hợp lệ.' }
  }

  const { error } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.pin,
  })

  if (error) return { success: false, error: 'Không thể đặt lại mã PIN.' }
  return { success: true, data: undefined }
}

export async function setUserActive(input: {
  userId: string
  isActive: boolean
}): Promise<ActionResult<void>> {
  try {
    await requireManager()
  } catch {
    return { success: false, error: 'Không có quyền quản lý.' }
  }

  const parsed = userActiveSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Thông tin tài khoản không hợp lệ.' }
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ is_active: parsed.data.isActive })
    .eq('id', parsed.data.userId)

  if (error) return { success: false, error: 'Không thể cập nhật trạng thái tài khoản.' }
  revalidatePath('/admin/users')
  return { success: true, data: undefined }
}
