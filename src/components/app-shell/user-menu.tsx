import { signOut } from '@/modules/auth/actions'
import type { AppUser } from '@/modules/auth/service'

export function UserMenu({ user }: { user: AppUser }) {
  const isManager = user.role === 'manager'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-right">
        <div className="hidden sm:block">
          <p className="text-xs font-bold text-slate-900">{user.fullName}</p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${isManager ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200'}`}>
              {isManager ? 'Quản lý' : 'Nhân viên'}
            </span>
            <span className="text-[11px] text-slate-600 font-mono">@{user.username}</span>
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm ring-2 ring-sky-500/20">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
      </div>
      <form action={signOut}>
        <button
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 active:scale-95 transition-all duration-150"
          type="submit"
        >
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </form>
    </div>
  )
}
