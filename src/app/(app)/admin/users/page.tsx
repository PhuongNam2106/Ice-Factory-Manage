import { redirect } from 'next/navigation'
import { UserAdminPanel } from '@/components/forms/user-admin-panel'
import { PageHeader } from '@/components/ui/page-header'
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
      <PageHeader
        badge="Quản trị hệ thống"
        description="Tạo mới tài khoản, phân quyền Quản lý / Nhân viên và quản lý trạng thái tài khoản"
        title="Tài Khoản Người Dùng"
      />

      <UserAdminPanel profiles={profiles} />
    </section>
  )
}

