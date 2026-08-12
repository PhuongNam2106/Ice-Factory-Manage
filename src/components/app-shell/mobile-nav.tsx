import Link from 'next/link'

const items = [
  { href: '/', label: 'Hôm nay', icon: '⌂' },
  { href: '/sales', label: 'Nhập liệu', icon: '+' },
  { href: '/alerts', label: 'Cảnh báo', icon: '!' },
  { href: '/account', label: 'Tài khoản', icon: '◉' },
]

export function MobileNav() {
  return (
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-600" href={item.href}>
              <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
