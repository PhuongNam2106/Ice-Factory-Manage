'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Factory,
  GearSix,
  House,
  Scales,
  ShoppingCartSimple,
  User,
} from '@phosphor-icons/react'

export function MobileNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname()

  const mobileItems = [
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
      href: '/loss',
      label: 'Hao hụt',
      icon: Scales,
    },
    isManager
      ? {
          href: '/admin/customers',
          label: 'Quản trị',
          icon: GearSix,
        }
      : {
          href: '/account',
          label: 'Tài khoản',
          icon: User,
        },
  ]

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5 px-1 py-1">
        {mobileItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  isActive
                    ? 'font-bold text-sky-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                href={item.href}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sky-100/90 text-sky-700'
                      : 'text-slate-500'
                  }`}
                >
                  <Icon
                    className="h-5 w-5 shrink-0"
                    weight={isActive ? 'duotone' : 'regular'}
                  />
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
