import Link from 'next/link'
import { RetailSaleForm } from '@/components/forms/retail-sale-form'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default function NewRetailSalePage() {
  const operatingDay = getOperatingDay(new Date())

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 transition hover:text-sky-900"
          href="/sales"
        >
          <span>← Quay lại Bán hàng</span>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Nhập Bán Lẻ</h1>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            🏪 Bán lẻ ca
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Tổng hợp theo ca · Ngày vận hành <span className="font-semibold text-slate-700">{operatingDay}</span>
        </p>
      </div>

      <RetailSaleForm operatingDay={operatingDay} />
    </section>
  )
}
