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
    .select('id, username, phone, full_name, role, is_active')
    .order('full_name')

  if (error) throw new Error('Không thể tải danh sách tài khoản.')

  return (
    <section className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Quản trị hệ thống
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Tài Khoản Người Dùng
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Tạo mới tài khoản, phân quyền Quản lý / Nhân viên và đổi mật khẩu.
        </p>
      </div>

      <UserAdminPanel profiles={profiles} />
    </section>
  )
}
