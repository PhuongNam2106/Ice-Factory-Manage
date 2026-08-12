import 'server-only'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AppUser = {
  id: string
  username: string
  phone: string | null
  fullName: string
  role: 'employee' | 'manager'
}

export class AuthorizationError extends Error {}
class InvalidSessionProfileError extends AuthorizationError {}

async function getVerifiedProfile(): Promise<AppUser> {
  const supabase = await createServerSupabaseClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || typeof userId !== 'string') {
    throw new AuthorizationError('Chưa đăng nhập')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, phone, full_name, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile || !profile.is_active) {
    throw new InvalidSessionProfileError('Tài khoản không hoạt động')
  }

  return {
    id: profile.id,
    username: profile.username,
    phone: profile.phone,
    fullName: profile.full_name,
    role: profile.role,
  }
}

export async function requireUser(): Promise<AppUser> {
  try {
    return await getVerifiedProfile()
  } catch (error) {
    if (error instanceof InvalidSessionProfileError) {
      redirect('/auth/inactive')
    }
    redirect('/login')
  }
}

export async function requireManager(): Promise<AppUser> {
  const user = await requireUser()

  if (user.role !== 'manager') {
    throw new AuthorizationError('Không có quyền quản lý')
  }

  return user
}
