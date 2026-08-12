'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { authorizeManagerAction } from '@/modules/auth/action-authorization'
import {
  userActiveSchema,
  userCreateSchema,
  userPinResetSchema,
} from '@/modules/auth/schema'
import {
  createUserWithAdmin,
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

export async function resetUserPin(input: {
  userId: string
  pin: string
}): Promise<ActionResult<void>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = userPinResetSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Mã PIN không hợp lệ.')
  }

  const { error } = await adminClient.auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.pin,
  })

  if (error) return actionFailure('RESET_PIN_FAILED', 'Không thể đặt lại mã PIN.')
  return actionSuccess(undefined)
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
