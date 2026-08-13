import Link from 'next/link'
import { RetailSaleForm } from '@/components/forms/retail-sale-form'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default function NewRetailSalePage() {
  const operatingDay = getOperatingDay(new Date())
  return <section className="mx-auto max-w-3xl space-y-6"><div><Link className="text-sm font-semibold text-sky-700 hover:underline" href="/sales">← Bán hàng</Link><h1 className="mt-2 text-3xl font-bold tracking-tight">Nhập bán lẻ</h1><p className="mt-1 text-slate-600">Tổng hợp theo ca · ngày {operatingDay}</p></div><RetailSaleForm operatingDay={operatingDay} /></section>
}
