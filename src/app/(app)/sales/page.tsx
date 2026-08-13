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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Ngày vận hành {operatingDay}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Bán Hàng</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            className="flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-600/20 transition-all hover:bg-sky-700 active:scale-95"
            href="/sales/new/wholesale"
          >
            <span>+ Nhập Bán Sỉ</span>
          </Link>
          <Link
            className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-sky-800 shadow-xs transition-all hover:bg-sky-50 active:scale-95"
            href="/sales/new/retail"
          >
            <span>+ Nhập Bán Lẻ</span>
          </Link>
        </div>
      </div>

      <section aria-labelledby="sales-today-heading" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900" id="sales-today-heading">Giao Dịch Trong Ngày</h2>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
            {sales.length} giao dịch
          </span>
        </div>

        {sales.length ? (
          <ul className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <li className="flex flex-col gap-3 p-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between" key={sale.id}>
                <div className="flex items-start gap-3.5">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                    sale.kind === 'wholesale' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {sale.kind === 'wholesale' ? '📦' : '🏪'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">
                        {sale.kind === 'wholesale' ? sale.customerName ?? 'Bán sỉ thu đủ' : `Bán lẻ · Ca ${sale.shiftCode}`}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        sale.kind === 'wholesale' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {sale.kind === 'wholesale' ? 'Bán sỉ' : 'Bán lẻ'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Đã thu: <span className="font-semibold text-slate-700">{currency.format(sale.paidNowVnd)} đ</span>
                      <span className="mx-2">•</span>
                      Trạng thái: <span className={`font-semibold ${sale.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {sale.status === 'active' ? 'Đang hiệu lực' : 'Đã hủy'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right sm:self-center">
                  <p className="text-lg font-extrabold text-slate-950">{currency.format(sale.totalVnd)} đ</p>
                  <p className="text-[11px] text-slate-400">{new Date(sale.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              🛒
            </div>
            <p className="text-sm font-semibold text-slate-700">Chưa có giao dịch bán hàng nào trong ngày {operatingDay}.</p>
            <p className="mt-1 text-xs text-slate-500">Bấm nút nhập bán sỉ hoặc bán lẻ phía trên để thêm giao dịch.</p>
          </div>
        )}
      </section>
    </section>
  )
}
