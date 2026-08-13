import Link from 'next/link'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function HomePage() {
  await ensureOperatingDay(getOperatingDay(new Date()))

  return (
    <section aria-labelledby="today-title" className="space-y-6">
      <div>
        <p className="text-sm font-medium text-sky-700">Hôm nay</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950" id="today-title">Tổng quan vận hành</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="rounded-2xl bg-sky-700 p-5 text-lg font-bold text-white hover:bg-sky-800" href="/sales/new/wholesale">+ Bán sỉ</Link>
        <Link className="rounded-2xl border border-sky-200 bg-white p-5 text-lg font-bold text-sky-800 hover:bg-sky-50" href="/sales/new/retail">+ Bán lẻ</Link>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">Số liệu vận hành trong ngày sẽ xuất hiện tại đây.</div>
    </section>
  )
}
