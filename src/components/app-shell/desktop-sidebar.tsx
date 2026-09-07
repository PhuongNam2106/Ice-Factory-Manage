'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BellRinging,
  ClockCounterClockwise,
  Cpu,
  Factory,
  HandCoins,
  House,
  LockKey,
  Receipt,
  Scales,
  ShoppingCartSimple,
  Snowflake,
  UserGear,
  Users,
} from '@phosphor-icons/react'

type NavItem = {
  href: string
  label: string
  icon: typeof House
}

const items: NavItem[] = [
  {
    href: '/',
    label: 'Hôm nay',
    icon: House,
  },
  {
    href: '/sales',
    label: 'Bán hàng',
    icon: ShoppingCartSimple,
  },
  {
    href: '/production',
    label: 'Sản xuất',
    icon: Factory,
  },
  {
    href: '/expenses',
    label: 'Chi phí',
    icon: Receipt,
  },
  {
    href: '/receivables',
    label: 'Công nợ',
    icon: HandCoins,
  },
  {
    href: '/loss',
    label: 'Hao hụt',
    icon: Scales,
  },
  {
    href: '/alerts',
    label: 'Cảnh báo',
    icon: BellRinging,
  },
]

const managerItems: NavItem[] = [
  {
    href: '/closing',
    label: 'Đối chiếu & khóa sổ',
    icon: LockKey,
  },
  {
    href: '/admin/audit',
    label: 'Lịch sử audit',
    icon: ClockCounterClockwise,
  },
  {
    href: '/admin/customers',
    label: 'Khách hàng',
    icon: Users,
  },
  {
    href: '/admin/machines',
    label: 'Danh mục máy',
    icon: Cpu,
  },
  {
    href: '/admin/users',
    label: 'Quản trị tài khoản',
    icon: UserGear,
  },
]

export function DesktopSidebar({ isManager }: { isManager: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 hidden w-64 border-r border-slate-800 bg-slate-950 text-slate-100 md:block">
      <div className="flex items-center gap-3 border-b border-slate-800/90 px-6 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 font-bold text-white shadow-md shadow-sky-500/20">
          <Snowflake className="h-5 w-5 text-white" weight="bold" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-400">
            Hệ Thống
          </p>
          <p className="truncate text-base font-extrabold text-white">Xưởng Nước Đá</p>
        </div>
      </div>

      <div className="h-[calc(100vh-80px)] overflow-y-auto px-3 py-4">
        <nav aria-label="Điều hướng chính" className="space-y-6">
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Vận hành hàng ngày
            </p>
            <ul className="space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <li key={href}>
                    <Link
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isActive
                          ? 'bg-sky-500/15 font-bold text-sky-400 ring-1 ring-sky-500/30'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                      href={href}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? 'text-sky-400' : 'text-slate-400'
                        }`}
                        weight={isActive ? 'duotone' : 'regular'}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {isManager ? (
            <div>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quản trị & Danh mục
              </p>
              <ul className="space-y-1">
                {managerItems.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <li key={href}>
                      <Link
                        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                          isActive
                            ? 'bg-sky-500/15 font-bold text-sky-400 ring-1 ring-sky-500/30'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                        href={href}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive ? 'text-sky-400' : 'text-slate-400'
                          }`}
                          weight={isActive ? 'duotone' : 'regular'}
                        />
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </nav>
      </div>
    </aside>
  )
}
