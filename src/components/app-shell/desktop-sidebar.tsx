import Link from 'next/link'

const items = [
  ['/', 'Hôm nay'],
  ['/sales', 'Bán hàng'],
  ['/production', 'Sản xuất'],
  ['/expenses', 'Chi phí'],
  ['/receivables', 'Công nợ'],
  ['/inventory', 'Kiểm kho'],
  ['/alerts', 'Cảnh báo'],
]

const managerItems = [
  ['/admin/customers', 'Danh mục khách hàng'],
  ['/admin/machines', 'Danh mục máy'],
  ['/admin/users', 'Quản trị tài khoản'],
]

export function DesktopSidebar({ isManager }: { isManager: boolean }) {
  return (
    <aside className="fixed inset-y-0 hidden w-64 border-r border-sky-900 bg-sky-950 text-sky-50 md:block">
      <div className="border-b border-sky-900 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Vận hành</p>
        <p className="mt-1 text-lg font-bold">Xưởng nước đá</p>
      </div>
      <nav aria-label="Điều hướng chính" className="p-3">
        <ul className="space-y-1">
          {items.map(([href, label]) => (
            <li key={href}>
              <Link className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-300" href={href}>{label}</Link>
            </li>
          ))}
          {isManager ? managerItems.map(([href, label]) => (
            <li key={href}>
              <Link className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-300" href={href}>{label}</Link>
            </li>
          )) : null}
        </ul>
      </nav>
    </aside>
  )
}
