'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { actionFailure, type ActionResult } from '@/lib/result'
import { authorizeManagerAction } from '@/modules/auth/action-authorization'
import {
  userActiveSchema,
  userCreateSchema,
  userPasswordResetSchema,
} from '@/modules/auth/schema'
import {
  createUserWithAdmin,
  resetUserPasswordWithAdmin,
  setUserActiveWithAdmin,
  type CreateUserInput,
} from './service'

export async function createUser(input: CreateUserInput): Promise<ActionResult<void>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = userCreateSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin tài khoản không hợp lệ.')
  }

  const result = await createUserWithAdmin(adminClient, parsed.data)
  if (result.ok) revalidatePath('/admin/users')
  return result
}

export async function resetUserPassword(input: {
  userId: string
  password: string
}): Promise<ActionResult<void>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = userPasswordResetSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Mật khẩu không hợp lệ.')
  }

  return resetUserPasswordWithAdmin(adminClient, parsed.data)
}

export async function setUserActive(input: {
  userId: string
  isActive: boolean
}): Promise<ActionResult<void>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = userActiveSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin tài khoản không hợp lệ.')
  }

  const result = await setUserActiveWithAdmin(adminClient, parsed.data)
  if (result.ok) revalidatePath('/admin/users')
  return result
}
