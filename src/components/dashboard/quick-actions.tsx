import Link from 'next/link'

const actions = [
  ['/sales/new/wholesale', 'Bán sỉ', 'Giao cho đầu mối'], ['/sales/new/retail', 'Bán lẻ', 'Tổng theo ca'],
  ['/production', 'Sản xuất', 'Theo dõi từng máy'], ['/expenses/new', 'Chi phí', 'Kèm chứng từ'],
  ['/receivables', 'Thu nợ', 'Phân bổ công nợ'], ['/loss', 'Hao hụt', 'Nhập tồn cuối'],
] as const

export function QuickActions() {
  return <section aria-labelledby="quick-actions-title"><h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500" id="quick-actions-title">Nhập nhanh</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{actions.map(([href, label, note], index) => <Link className={`flex min-h-24 min-w-0 touch-manipulation flex-col justify-between rounded-2xl border p-4 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${index === 0 ? 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800' : 'border-slate-200 bg-white text-slate-950 hover:border-sky-300 hover:bg-sky-50'}`} href={href} key={href}><span className="break-words text-sm font-extrabold">{label}</span><span className="break-words text-[11px] opacity-70">{note}</span></Link>)}</div></section>
}
