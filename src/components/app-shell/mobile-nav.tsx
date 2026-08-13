'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MobileNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname()

  const mobileItems = [
    {
      href: '/',
      label: 'Hôm nay',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/sales',
      label: 'Bán hàng',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      href: '/alerts',
      label: 'Cảnh báo',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    isManager
      ? {
          href: '/admin/customers',
          label: 'Quản trị',
          icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ),
        }
      : {
          href: '/account',
          label: 'Tài khoản',
          icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
  ]

  return (
    <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="grid grid-cols-4 px-2">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <li key={item.href}>
              <Link
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'font-bold text-sky-700'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                href={item.href}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-sky-100/80 text-sky-700' : 'text-slate-500'}`}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
