import { signOut } from '@/modules/auth/actions'
import type { AppUser } from '@/modules/auth/service'
import { SignOut } from '@phosphor-icons/react/dist/ssr'

export function UserMenu({ user }: { user: AppUser }) {
  const isManager = user.role === 'manager'

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="flex items-center gap-2 text-right">
        <div className="hidden sm:block">
          <p className="text-xs font-extrabold text-slate-900">{user.fullName}</p>
          <div className="mt-0.5 flex items-center justify-end gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isManager
                  ? 'border border-amber-200 bg-amber-50 text-amber-900'
                  : 'border border-sky-200 bg-sky-50 text-sky-900'
              }`}
            >
              {isManager ? 'Quản lý' : 'Nhân viên'}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              @{user.username}
            </span>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white shadow-2xs ring-2 ring-sky-500/20"
        >
          {user.fullName.charAt(0).toUpperCase()}
        </div>
      </div>
      <form action={signOut}>
        <button
          aria-label="Đăng xuất khỏi hệ thống"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          type="submit"
        >
          <SignOut className="h-4 w-4 text-slate-500" weight="bold" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </form>
    </div>
  )
}
