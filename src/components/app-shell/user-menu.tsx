import { signOut } from '@/modules/auth/actions'
import type { AppUser } from '@/modules/auth/service'

export function UserMenu({ user }: { user: AppUser }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
        <p className="text-xs capitalize text-slate-500">{user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</p>
      </div>
      <form action={signOut}>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600" type="submit">Đăng xuất</button>
      </form>
    </div>
  )
}
