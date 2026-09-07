import { DesktopSidebar } from '@/components/app-shell/desktop-sidebar'
import { MobileNav } from '@/components/app-shell/mobile-nav'
import { UserMenu } from '@/components/app-shell/user-menu'
import { requireUser } from '@/modules/auth/service'
import { FileText, Snowflake } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser()

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 antialiased">
      <a
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        href="#main-content"
      >
        Đi đến nội dung chính
      </a>

      <DesktopSidebar isManager={user.role === 'manager'} />

      <div className="pb-24 md:ml-64 md:pb-12">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-xs">
              <Snowflake className="h-4 w-4" weight="bold" />
            </div>
            <p className="font-extrabold text-slate-950">Xưởng Nước Đá</p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              href="/reports"
            >
              <FileText className="h-4 w-4 text-sky-600" weight="bold" />
              <span>Báo cáo</span>
            </Link>
            <UserMenu user={user} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8" id="main-content">
          {children}
        </main>
      </div>

      <MobileNav isManager={user.role === 'manager'} />
    </div>
  )
}
