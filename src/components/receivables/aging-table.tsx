import Link from 'next/link'
import { CheckCircle, Warning, CaretRight, Phone, Clock, FileText } from '@phosphor-icons/react/dist/ssr'
import type { CustomerDebtSummary } from '@/modules/receivables/types'

const currency = new Intl.NumberFormat('vi-VN')

export function AgingTable({ summaries }: { summaries: CustomerDebtSummary[] }) {
  if (!summaries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle size={28} weight="duotone" />
        </div>
        <p className="text-base font-bold text-slate-900">Không Có Dư Nợ Khách Hàng</p>
        <p className="mt-1 text-xs text-slate-500">Tất cả đơn bán sỉ đã được thanh toán hoặc không phát sinh nợ quá hạn.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Mobile Card View (md:hidden) */}
      <div className="space-y-3 md:hidden">
        {summaries.map((summary) => {
          const hasOverdue = summary.overdueVnd > 0

          return (
            <div
              key={summary.customerId}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{summary.customerName}</p>
                  {summary.customerPhone ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Phone size={13} weight="regular" />
                      <span>{summary.customerPhone}</span>
                    </p>
                  ) : null}
                </div>
                {hasOverdue ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200/60">
                    <Warning size={13} weight="fill" />
                    <span>Quá hạn</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    Trong hạn
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500">Tổng dư nợ:</span>
                  <p className="font-black text-slate-900 tabular-nums">
                    {currency.format(summary.totalOutstandingVnd)} đ
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Nợ quá hạn:</span>
                  <p className={`font-black tabular-nums ${hasOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                    {hasOverdue ? `${currency.format(summary.overdueVnd)} đ` : '0 đ'}
                  </p>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    <span>{summary.openReceivablesCount} khoản nợ</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Hạn: {summary.oldestDueDate ?? '—'}</span>
                  </span>
                </div>
              </div>

              <Link
                className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-sky-700 active:scale-[0.99]"
                href={`/receivables/${summary.customerId}`}
              >
                <span>Thu nợ khách hàng</span>
                <CaretRight size={14} weight="bold" />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Desktop Table View (hidden md:block) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
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
                    <td className="px-6 py-4 text-right font-extrabold text-slate-950 tabular-nums">
                      {currency.format(summary.totalOutstandingVnd)} đ
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasOverdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200/60 tabular-nums">
                          <Warning size={13} weight="fill" />
                          <span>{currency.format(summary.overdueVnd)} đ</span>
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
                        <span>Thu nợ</span>
                        <CaretRight size={14} weight="bold" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

