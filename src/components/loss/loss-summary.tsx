import { Warning } from '@phosphor-icons/react/dist/ssr'
import type { DailyLossReport } from '@/modules/loss/types'

function bags(value: number | null) {
  return value == null ? 'Chưa có' : `${value.toLocaleString('vi-VN')} bao`
}

function trimPercentage(value: string) {
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 })
}

function resultFor(report: DailyLossReport) {
  if (report.differenceBags == null || report.classification == null) {
    return { label: 'Chưa đối soát tồn cuối', tone: 'border-slate-200/80 bg-slate-50 text-slate-800' }
  }
  if (report.classification === 'matched') {
    return { label: 'Khớp kho · Không chênh lệch', tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' }
  }
  if (report.classification === 'surplus') {
    return { label: `Dư kho ${Math.abs(report.differenceBags).toLocaleString('vi-VN')} bao`, tone: 'border-sky-200 bg-sky-50 text-sky-950' }
  }
  if (report.classification === 'no_production') {
    const label = report.differenceBags > 0
      ? `Hao hụt ${report.differenceBags.toLocaleString('vi-VN')} bao`
      : report.differenceBags < 0
        ? `Dư kho ${Math.abs(report.differenceBags).toLocaleString('vi-VN')} bao`
        : 'Khớp kho · Không chênh lệch'
    return { label, tone: report.differenceBags === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-950' }
  }
  const overThreshold = report.requiresReview
  return {
    label: `Hao hụt ${report.differenceBags.toLocaleString('vi-VN')} bao`,
    tone: overThreshold ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950',
  }
}

export function LossSummary({ report }: { report: DailyLossReport }) {
  const result = resultFor(report)

  return (
    <section aria-labelledby="loss-summary-title" className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Phương trình cân bằng kho</p>
          <h2 className="text-xl font-extrabold text-slate-950" id="loss-summary-title">Đối soát ngày {report.operatingDay}</h2>
        </div>
        <p className="text-xs text-slate-500 font-medium">Chu kỳ [20:00 → 20:00 hôm sau)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Tồn đầu', bags(report.openingBags), '+'],
          ['Tổng sản xuất', bags(report.producedBags), '−'],
          ['Tổng bán sỉ/lẻ', bags(report.soldBags), '='],
          ['Tồn cuối dự kiến', bags(report.expectedClosingBags), null],
        ].map(([label, value, operator]) => (
          <article className="relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs" key={label}>
            {operator ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-3 left-1/2 z-[1] flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white sm:-right-4 sm:bottom-auto sm:left-auto sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 shadow-sm"
              >
                {operator}
              </span>
            ) : null}
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950 tabular-nums">{value}</p>
          </article>
        ))}
      </div>

      <div className={`rounded-2xl border p-5 ${result.tone}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide opacity-75">Kết quả kiểm kê</p>
            <p className="mt-1 text-xl font-black">{result.label}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-bold">Tồn cuối thực tế: <span className="tabular-nums">{bags(report.closingBags)}</span></p>
            <p className="mt-1 text-sm">
              {report.differencePct == null
                ? 'Không thể tính tỷ lệ vì chưa có sản lượng'
                : `Tỷ lệ ${trimPercentage(report.differencePct)}%`}
            </p>
          </div>
        </div>
      </div>

      {report.isStale ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950" role="alert">
          <Warning size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm">Số liệu đã thay đổi</p>
            <p className="mt-0.5 text-xs text-rose-800">Sản lượng hoặc đơn bán hàng đã cập nhật sau lần lưu gần nhất. Vui lòng kiểm tra và lưu lại tồn cuối.</p>
          </div>
        </div>
      ) : null}
      {report.requiresReview ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950" role="alert">
          <Warning size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm">Chênh lệch vượt ngưỡng {trimPercentage(report.warningPct)}%</p>
            <p className="mt-0.5 text-xs text-rose-800">Quản lý cần kiểm tra nguyên nhân và xác nhận cảnh báo trước khi chốt khóa ngày.</p>
          </div>
        </div>
      ) : null}
      {report.pendingHarvestCount > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" role="status">
          <Warning size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-sm">Chưa đủ dữ liệu sản xuất</p>
            <p className="mt-0.5 text-xs text-amber-800">Còn {report.pendingHarvestCount} lần xả đá chưa nhập số bao thực tế.</p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
