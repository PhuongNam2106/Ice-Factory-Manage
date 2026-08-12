'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loginSchema } from './schema'
import { redirect } from 'next/navigation'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function signInWithPin(input: {
  phone: string
  pin: string
}): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: 'Số điện thoại hoặc mã PIN không hợp lệ.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: parsed.data.phone,
    password: parsed.data.pin,
  })

  if (error || !data.user) {
    return { success: false, error: 'Số điện thoại hoặc mã PIN không đúng.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError || !profile?.is_active) {
    await supabase.auth.signOut()
    return { success: false, error: 'Tài khoản đã bị ngừng hoạt động.' }
  }

  return { success: true, data: undefined }
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
