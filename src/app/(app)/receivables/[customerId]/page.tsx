import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ReceiptForm } from '@/components/forms/receipt-form'
import { getCustomerById } from '@/modules/admin/catalog-service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'
import {
  listOpenReceivablesByCustomer,
  listReceiptsByCustomer,
} from '@/modules/receivables/repository'

const currency = new Intl.NumberFormat('vi-VN')

export default async function CustomerReceivablesPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const operatingDay = getOperatingDay(new Date())
  const supabase = await createServerSupabaseClient()
  await ensureOperatingDay(operatingDay, supabase)

  const [customer, openReceivables, receipts] = await Promise.all([
    getCustomerById(customerId),
    listOpenReceivablesByCustomer(supabase, customerId),
    listReceiptsByCustomer(supabase, customerId),
  ])

  const totalOutstanding = openReceivables.reduce((sum: number, rec) => sum + rec.outstandingAmountVnd, 0)

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 transition hover:text-sky-900"
          href="/receivables"
        >
          <span>← Quay lại Danh sách Công nợ</span>
        </Link>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {customer?.name ?? 'Khách Hàng'}
            </h1>
            {customer?.phone ? (
              <p className="text-xs text-slate-500">SĐT liên hệ: {customer.phone}</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-sky-50 px-4 py-2 text-right border border-sky-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Tổng Dư Nợ Khách Hàng</span>
            <p className="text-xl font-black text-sky-950">{currency.format(totalOutstanding)} VNĐ</p>
          </div>
        </div>
      </div>

      <ReceiptForm
        customerId={customerId}
        customerName={customer?.name ?? 'Khách Hàng'}
        openReceivables={openReceivables}
        operatingDay={operatingDay}
      />

      {/* Receipts History */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Lịch Sử Phiếu Thu Tiền</h2>
        </div>
        {receipts.length ? (
          <ul className="divide-y divide-slate-100">
            {receipts.map((receipt) => (
              <li className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between" key={receipt.id}>
                <div>
                  <p className="font-bold text-slate-900">
                    Thu tiền ngày {receipt.operatingDay} ({receipt.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'})
                  </p>
                  {receipt.note ? (
                    <p className="text-xs text-slate-500">Ghi chú: {receipt.note}</p>
                  ) : null}
                </div>
                <p className="text-lg font-extrabold text-emerald-700">
                  +{currency.format(receipt.amountVnd)} đ
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-xs text-slate-500">Chưa có phiếu thu tiền nào được ghi nhận cho khách hàng này.</p>
        )}
      </div>
    </section>
  )
}
