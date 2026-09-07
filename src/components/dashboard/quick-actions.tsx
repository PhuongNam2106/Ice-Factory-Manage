import Link from 'next/link'
import {
  Factory,
  HandCoins,
  Package,
  Receipt,
  Scales,
  Storefront,
} from '@phosphor-icons/react/dist/ssr'

const actions = [
  {
    href: '/sales/new/wholesale',
    label: 'Bán sỉ',
    note: 'Giao cho đầu mối',
    icon: Package,
    primary: true,
  },
  {
    href: '/sales/new/retail',
    label: 'Bán lẻ',
    note: 'Tổng theo ca',
    icon: Storefront,
    primary: false,
  },
  {
    href: '/production',
    label: 'Sản xuất',
    note: 'Theo dõi từng máy',
    icon: Factory,
    primary: false,
  },
  {
    href: '/expenses/new',
    label: 'Chi phí',
    note: 'Kèm chứng từ',
    icon: Receipt,
    primary: false,
  },
  {
    href: '/receivables',
    label: 'Thu nợ',
    note: 'Phân bổ công nợ',
    icon: HandCoins,
    primary: false,
  },
  {
    href: '/loss',
    label: 'Hao hụt',
    note: 'Nhập tồn cuối',
    icon: Scales,
    primary: false,
  },
] as const

export function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-title">
      <h2
        className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500"
        id="quick-actions-title"
      >
        Thao tác nhanh
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {actions.map(({ href, label, note, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-[84px] min-w-0 touch-manipulation flex-col justify-between rounded-2xl border p-3.5 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
              primary
                ? 'border-sky-700 bg-sky-700 text-white shadow-sm shadow-sky-700/20 hover:bg-sky-800'
                : 'border-slate-200/90 bg-white text-slate-950 shadow-2xs hover:border-sky-300 hover:bg-sky-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold">{label}</span>
              <Icon
                className={`h-5 w-5 ${primary ? 'text-sky-200' : 'text-sky-600'}`}
                weight="duotone"
              />
            </div>
            <span
              className={`text-[11px] font-medium leading-tight ${
                primary ? 'text-sky-100' : 'text-slate-500'
              }`}
            >
              {note}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
