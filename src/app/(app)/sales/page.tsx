import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { listSalesByDay } from '@/modules/sales/repository'

const currency = new Intl.NumberFormat('vi-VN')

export default async function SalesPage() {
  const operatingDay = getOperatingDay(new Date())
  const supabase = await createServerSupabaseClient()
  await ensureOperatingDay(operatingDay, supabase)
  const sales = await listSalesByDay(supabase, operatingDay)

  return (
    <section className="space-y-6">
      <div><p className="text-sm font-medium text-sky-700">Ngày {operatingDay}</p><h1 className="text-3xl font-bold tracking-tight">Bán hàng</h1></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-2xl bg-sky-700 p-5 text-lg font-bold text-white hover:bg-sky-800" href="/sales/new/wholesale">+ Nhập bán sỉ</Link>
        <Link className="rounded-2xl border border-sky-200 bg-white p-5 text-lg font-bold text-sky-800 hover:bg-sky-50" href="/sales/new/retail">+ Nhập bán lẻ</Link>
      </div>
      <section aria-labelledby="sales-today" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold" id="sales-today">Giao dịch hôm nay</h2>
        {sales.length ? <ul className="divide-y divide-slate-200">{sales.map((sale) => <li className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between" key={sale.id}><div><p className="font-semibold">{sale.kind === 'wholesale' ? sale.customerName ?? 'Bán sỉ thu đủ' : `Bán lẻ · Ca ${sale.shiftCode}`}</p><p className="text-sm text-slate-600">Đã thu {currency.format(sale.paidNowVnd)} đ · {sale.status === 'active' ? 'Đang hiệu lực' : 'Đã hủy'}</p></div><p className="text-lg font-bold text-slate-950">{currency.format(sale.totalVnd)} đ</p></li>)}</ul> : <p className="p-5 text-slate-600">Chưa có giao dịch bán hàng trong ngày.</p>}
      </section>
    </section>
  )
}
