import { redirect } from 'next/navigation'
import { UserAdminPanel } from '@/components/forms/user-admin-panel'
import { adminClient } from '@/lib/supabase/admin'
import { AuthorizationError, requireManager } from '@/modules/auth/service'

export default async function UserAdministrationPage() {
  try {
    await requireManager()
  } catch (error) {
    if (error instanceof AuthorizationError) redirect('/')
    throw error
  }

  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, phone, full_name, role, is_active')
    .order('full_name')

  if (error) throw new Error('Không thể tải danh sách tài khoản.')

  return (
    <section className="space-y-6">
      <div><p className="text-sm font-medium text-sky-700">Quản trị</p><h1 className="text-3xl font-bold tracking-tight">Tài khoản người dùng</h1></div>
      <UserAdminPanel profiles={profiles} />
    </section>
  )
}
