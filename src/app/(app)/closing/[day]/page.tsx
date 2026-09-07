import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { CheckList } from '@/components/closing/check-list'
import { ConfirmLossWarningButton } from '@/components/closing/confirm-loss-warning-button'
import { LockDayDialog } from '@/components/closing/lock-day-dialog'
import { ReopenDayDialog } from '@/components/closing/reopen-day-dialog'
import { requireManager } from '@/modules/auth/service'
import { getDailyReconciliation } from '@/modules/closing/service'

const currency = new Intl.NumberFormat('vi-VN')

export default async function ClosingDayPage({ params }: { params: Promise<{ day: string }> }) {
  await requireManager()
  const { day } = await params
  const result = await getDailyReconciliation(day)
  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <p className="font-bold">{result.error.message}</p>
      </div>
    )
  }

  const data = result.data
  const reviewRequired = data.checks.some((check) => check.code === 'LOSS_REVIEW_REQUIRED')
  const hasBlock = data.checks.some((check) => check.blocking)

  return (
    <section className="space-y-6">
      <header>
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl pr-3 text-xs font-bold text-sky-700 hover:text-sky-900 transition"
          href="/closing"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Danh sách ngày khóa sổ</span>
        </Link>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Đối Chiếu Ngày {day}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Trạng thái: <span className="font-semibold text-slate-800">{data.status === 'locked' ? `Đã khóa sổ · Snapshot v${data.snapshotVersion}` : 'Đang mở'}</span>
            </p>
          </div>
          <span
            className={`self-start sm:self-auto rounded-lg px-3 py-1 text-xs font-bold ${
              data.status === 'locked' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            }`}
          >
            {data.status === 'locked' ? 'Đã khóa sổ' : 'Đang mở'}
          </span>
        </div>
      </header>

      {/* Financial Totals */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Dòng tiền trong ngày</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Doanh thu bán hàng', data.totals.revenueVnd, 'text-slate-950'],
            ['Thực thu tiền mặt/CK', data.totals.collectedVnd, 'text-emerald-700'],
            ['Chi phí đã duyệt', data.totals.approvedExpenseVnd, 'text-amber-800'],
            ['Công nợ phát sinh mới', data.totals.newDebtVnd, 'text-rose-700'],
          ].map(([label, value, colorClass]) => (
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs" key={String(label)}>
              <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
              <p className={`mt-1 text-xl font-black tabular-nums ${colorClass}`}>{currency.format(Number(value))} đ</p>
            </article>
          ))}
        </div>
      </div>

      {/* Bag Totals */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Cân đối kho đá (bao)</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Tồn đầu', data.totals.openingBags],
            ['Sản xuất', data.totals.productionBags],
            ['Đã bán', data.totals.soldBags],
            ['Tồn cuối', data.totals.closingBags],
            ['Chênh lệch', data.totals.differenceBags],
          ].map(([label, value]) => (
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs" key={String(label)}>
              <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black tabular-nums text-slate-950">
                {value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} bao`}
              </p>
            </article>
          ))}
        </div>
      </div>

      {/* Checklist & Actions */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Điều kiện khóa sổ</p>
        <CheckList checks={data.checks} />

        <div className="pt-2">
          {data.status === 'locked' ? (
            <ReopenDayDialog day={day} />
          ) : (
            <div className="flex flex-wrap gap-3">
              {reviewRequired && data.lossReportId && data.lossReportVersion ? (
                <ConfirmLossWarningButton expectedVersion={data.lossReportVersion} reportId={data.lossReportId} />
              ) : null}
              {!hasBlock ? <LockDayDialog day={day} /> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

