import Link from 'next/link'
import { WholesaleSaleForm } from '@/components/forms/wholesale-sale-form'
import { listActiveCustomers } from '@/modules/admin/catalog-service'
import { requireUser } from '@/modules/auth/service'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { ArrowLeft, Package } from '@phosphor-icons/react/dist/ssr'

export default async function NewWholesaleSalePage() {
  const [customers, user] = await Promise.all([
    listActiveCustomers(),
    requireUser(),
  ])
  const operatingDay = getOperatingDay(new Date())

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 transition hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          href="/sales"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          <span>Quay lại Bán hàng</span>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Nhập Bán Sỉ
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
            <Package className="h-4 w-4 text-sky-700" weight="duotone" />
            <span>Bán sỉ đầu mối</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Ngày vận hành: <span className="font-bold text-slate-700">{operatingDay}</span>
        </p>
      </div>

      <WholesaleSaleForm
        canEnterHistoricalPrice={user.role === 'manager'}
        currentOperatingDay={operatingDay}
        customers={customers}
      />
    </section>
  )
}
