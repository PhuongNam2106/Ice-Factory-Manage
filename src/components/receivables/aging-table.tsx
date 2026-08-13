import Link from 'next/link'
import type { CustomerDebtSummary } from '@/modules/receivables/types'

const currency = new Intl.NumberFormat('vi-VN')

export function AgingTable({ summaries }: { summaries: CustomerDebtSummary[] }) {
  if (!summaries.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">
          🎉
        </div>
        <p className="text-base font-bold text-slate-900">Không Có Dư Nợ Khách Hàng</p>
        <p className="mt-1 text-xs text-slate-500">Tất cả đơn bán sỉ đã được thanh toán hoặc không phát sinh nợ quá hạn.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Khách Hàng</th>
              <th className="px-6 py-4 text-right">Tổng Dư Nợ</th>
              <th className="px-6 py-4 text-right">Nợ Quá Hạn</th>
              <th className="px-6 py-4">Hạn Nợ Xa Nhất</th>
              <th className="px-6 py-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {summaries.map((summary) => {
              const hasOverdue = summary.overdueVnd > 0

              return (
                <tr className="transition-colors hover:bg-slate-50/80" key={summary.customerId}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{summary.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {summary.customerPhone ? `SĐT: ${summary.customerPhone} · ` : ''}
                      {summary.openReceivablesCount} khoản nợ chưa thu
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-slate-950">
                    {currency.format(summary.totalOutstandingVnd)} đ
                  </td>
                  <td className="px-6 py-4 text-right">
                    {hasOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                        ⚠️ {currency.format(summary.overdueVnd)} đ
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Không có</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                    {summary.oldestDueDate ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-sky-700 active:scale-95"
                      href={`/receivables/${summary.customerId}`}
                    >
                      <span>Thu nợ →</span>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
