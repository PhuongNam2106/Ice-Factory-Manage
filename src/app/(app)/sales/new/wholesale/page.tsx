import Link from 'next/link'
import { WholesaleSaleForm } from '@/components/forms/wholesale-sale-form'
import { listActiveCustomers } from '@/modules/admin/catalog-service'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function NewWholesaleSalePage() {
  const customers = await listActiveCustomers()
  const operatingDay = getOperatingDay(new Date())
  return <section className="mx-auto max-w-3xl space-y-6"><div><Link className="text-sm font-semibold text-sky-700 hover:underline" href="/sales">← Bán hàng</Link><h1 className="mt-2 text-3xl font-bold tracking-tight">Nhập bán sỉ</h1><p className="mt-1 text-slate-600">Ngày vận hành {operatingDay}</p></div><WholesaleSaleForm customers={customers} operatingDay={operatingDay} /></section>
}
