import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function HomePage() {
  await ensureOperatingDay(getOperatingDay(new Date()))

  return (
    <section aria-labelledby="today-title" className="space-y-6">
      <div>
        <p className="text-sm font-medium text-sky-700">Hôm nay</p>
        <h1 id="today-title" className="text-3xl font-bold tracking-tight text-slate-950">Tổng quan vận hành</h1>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
        Dữ liệu vận hành sẽ xuất hiện tại đây.
      </div>
    </section>
  )
}
