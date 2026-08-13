import { DesktopSidebar } from '@/components/app-shell/desktop-sidebar'
import { MobileNav } from '@/components/app-shell/mobile-nav'
import { UserMenu } from '@/components/app-shell/user-menu'
import { requireUser } from '@/modules/auth/service'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser()

  return (
    <div className="min-h-screen bg-slate-50">
      <DesktopSidebar isManager={user.role === 'manager'} />
      <div className="pb-20 md:ml-64 md:pb-0">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <p className="font-semibold text-slate-900 md:hidden">Xưởng nước đá</p>
          <div className="ml-auto"><UserMenu user={user} /></div>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
      <MobileNav isManager={user.role === 'manager'} />
    </div>
  )
}
