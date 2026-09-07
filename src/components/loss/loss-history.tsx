import Link from 'next/link'
import { CaretRight, CheckCircle, Warning, WarningCircle } from '@phosphor-icons/react/dist/ssr'
import type { DailyLossHistoryItem, LossClassification } from '@/modules/loss/types'

function formatBags(value: number) {
  return value.toLocaleString('vi-VN')
}

function formatRate(value: string | null) {
  return value == null ? 'Không có sản lượng' : `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}%`
}

function status(item: DailyLossHistoryItem) {
  const labels: Record<LossClassification, string> = {
    matched: 'Khớp kho',
    loss: `Hao hụt ${formatBags(item.differenceBags)} bao`,
    surplus: `Dư kho ${formatBags(Math.abs(item.differenceBags))} bao`,
    no_production: item.differenceBags === 0 ? 'Không sản xuất · Khớp kho' : 'Không sản xuất · Có chênh lệch',
  }
  const tone = item.requiresReview && !item.warningConfirmedAt
    ? 'bg-rose-50 text-rose-800 border-rose-200/60'
    : item.classification === 'matched'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
      : 'bg-amber-50 text-amber-900 border-amber-200/60'
  return { label: labels[item.classification], tone, requiresReview: item.requiresReview && !item.warningConfirmedAt, matched: item.classification === 'matched' }
}

export function LossHistory({ items }: { items: DailyLossHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">Chưa có ngày nào được đối soát.</p>
  }

  return (
    <section aria-labelledby="loss-history-title" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-950" id="loss-history-title">Lịch Sử Đối Soát</h2>
        <span className="text-xs font-semibold text-slate-500">{items.length} ngày gần nhất</span>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const currentStatus = status(item)
          return (
            <Link className="block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition active:scale-[0.99] hover:border-slate-300" href={`/loss/${item.operatingDay}`} key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-slate-950">Ngày {item.operatingDay}</p>
                  <p className="mt-1 text-xs text-slate-500">Tồn đầu {formatBags(item.openingBags)} · Tồn cuối {formatBags(item.closingBags)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${currentStatus.tone}`}>
                  {currentStatus.requiresReview ? (
                    <Warning size={12} weight="fill" />
                  ) : currentStatus.matched ? (
                    <CheckCircle size={12} weight="fill" />
                  ) : (
                    <WarningCircle size={12} weight="fill" />
                  )}
                  <span>{currentStatus.label}</span>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-sm">
                <div><p className="text-[11px] text-slate-500">Sản xuất</p><p className="font-bold tabular-nums text-slate-900">{formatBags(item.producedBags)}</p></div>
                <div><p className="text-[11px] text-slate-500">Đã bán</p><p className="font-bold tabular-nums text-slate-900">{formatBags(item.soldBags)}</p></div>
                <div><p className="text-[11px] text-slate-500">Tỷ lệ</p><p className="font-bold tabular-nums text-slate-900">{formatRate(item.differencePct)}</p></div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <tr>
              {['Ngày', 'Tồn đầu', 'Sản xuất', 'Đã bán', 'Tồn cuối', 'Chênh lệch', 'Tỷ lệ', 'Trạng thái', ''].map((label) => (
                <th className="whitespace-nowrap px-4 py-3 font-bold" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {items.map((item) => {
              const currentStatus = status(item)
              return (
                <tr className="hover:bg-slate-50/80 transition-colors" key={item.id}>
                  <td className="px-4 py-3 font-bold">
                    <Link className="text-sky-700 hover:text-sky-900 hover:underline" href={`/loss/${item.operatingDay}`}>
                      {item.operatingDay}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatBags(item.openingBags)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatBags(item.producedBags)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatBags(item.soldBags)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatBags(item.closingBags)}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-slate-900">{item.differenceBags > 0 ? '+' : ''}{formatBags(item.differenceBags)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{formatRate(item.differencePct)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${currentStatus.tone}`}>
                      {currentStatus.requiresReview ? (
                        <Warning size={12} weight="fill" />
                      ) : currentStatus.matched ? (
                        <CheckCircle size={12} weight="fill" />
                      ) : (
                        <WarningCircle size={12} weight="fill" />
                      )}
                      <span>{currentStatus.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link className="text-slate-400 hover:text-sky-600 transition" href={`/loss/${item.operatingDay}`}>
                      <CaretRight size={16} weight="bold" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
