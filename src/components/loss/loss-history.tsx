import Link from 'next/link'
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
    ? 'bg-rose-100 text-rose-800'
    : item.classification === 'matched'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-900'
  return { label: labels[item.classification], tone }
}

export function LossHistory({ items }: { items: DailyLossHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-600">Chưa có ngày nào được đối soát.</p>
  }

  return (
    <section aria-labelledby="loss-history-title" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-950" id="loss-history-title">Lịch sử đối soát</h2>
        <span className="text-xs font-semibold text-slate-500">{items.length} ngày gần nhất</span>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const currentStatus = status(item)
          return (
            <Link className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]" href={`/loss/${item.operatingDay}`} key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-extrabold text-slate-950">Ngày {item.operatingDay}</p><p className="mt-1 text-xs text-slate-500">Tồn đầu {formatBags(item.openingBags)} · Tồn cuối {formatBags(item.closingBags)}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${currentStatus.tone}`}>{currentStatus.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-sm">
                <div><p className="text-xs text-slate-500">Sản xuất</p><p className="font-bold">{formatBags(item.producedBags)}</p></div>
                <div><p className="text-xs text-slate-500">Đã bán</p><p className="font-bold">{formatBags(item.soldBags)}</p></div>
                <div><p className="text-xs text-slate-500">Tỷ lệ</p><p className="font-bold">{formatRate(item.differencePct)}</p></div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Ngày', 'Tồn đầu', 'Sản xuất', 'Đã bán', 'Tồn cuối', 'Chênh lệch', 'Tỷ lệ', 'Trạng thái'].map((label) => <th className="whitespace-nowrap px-4 py-3" key={label}>{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const currentStatus = status(item)
              return (
                <tr className="hover:bg-sky-50/50" key={item.id}>
                  <td className="px-4 py-3 font-bold"><Link className="text-sky-800 hover:underline" href={`/loss/${item.operatingDay}`}>{item.operatingDay}</Link></td>
                  <td className="px-4 py-3">{formatBags(item.openingBags)}</td>
                  <td className="px-4 py-3">{formatBags(item.producedBags)}</td>
                  <td className="px-4 py-3">{formatBags(item.soldBags)}</td>
                  <td className="px-4 py-3">{formatBags(item.closingBags)}</td>
                  <td className="px-4 py-3 font-bold">{item.differenceBags > 0 ? '+' : ''}{formatBags(item.differenceBags)}</td>
                  <td className="px-4 py-3">{formatRate(item.differencePct)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${currentStatus.tone}`}>{currentStatus.label}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
