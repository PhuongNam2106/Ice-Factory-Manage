'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { requireManager } from '@/modules/auth/service'
import {
  userActiveSchema,
  userCreateSchema,
  userPinResetSchema,
} from '@/modules/auth/schema'
import type { ActionResult } from '@/modules/auth/actions'
import {
  createUserWithAdmin,
  setUserActiveWithAdmin,
  type CreateUserInput,
} from './service'

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

  const result = await setUserActiveWithAdmin(adminClient, parsed.data)
  if (result.success) revalidatePath('/admin/users')
  return result
}
