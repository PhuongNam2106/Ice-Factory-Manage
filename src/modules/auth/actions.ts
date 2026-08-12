'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { loginSchema, usernameToAuthEmail } from './schema'
import { redirect } from 'next/navigation'

export async function signInWithPassword(input: {
  username: string
  password: string
}): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Tên tài khoản hoặc mật khẩu không hợp lệ.')
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(parsed.data.username),
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return actionFailure('INVALID_CREDENTIALS', 'Tên tài khoản hoặc mật khẩu không đúng.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError || !profile?.is_active) {
    await supabase.auth.signOut()
    return actionFailure('ACCOUNT_INACTIVE', 'Tài khoản đã bị ngừng hoạt động.')
  }

  return actionSuccess(undefined)
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
