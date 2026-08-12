'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { loginSchema } from './schema'
import { redirect } from 'next/navigation'

export async function signInWithPin(input: {
  phone: string
  pin: string
}): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Số điện thoại hoặc mã PIN không hợp lệ.')
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: parsed.data.phone,
    password: parsed.data.pin,
  })

  if (error || !data.user) {
    return actionFailure('INVALID_CREDENTIALS', 'Số điện thoại hoặc mã PIN không đúng.')
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
