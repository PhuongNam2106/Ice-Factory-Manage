import Link from 'next/link'
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
  if (!result.ok) return <p className="rounded-2xl bg-rose-50 p-4 text-rose-900">{result.error.message}</p>
  const data = result.data
  const reviewRequired = data.checks.some((check) => check.code === 'LOSS_REVIEW_REQUIRED')
  const hasBlock = data.checks.some((check) => check.blocking)
  return <section className="space-y-6"><header><Link className="text-sm font-bold text-sky-700" href="/closing">← Danh sách ngày</Link><h1 className="mt-2 text-2xl font-extrabold text-slate-950">Đối Chiếu {day}</h1><p className="text-sm text-slate-600">Trạng thái: {data.status === 'locked' ? `Đã khóa · snapshot v${data.snapshotVersion}` : 'Đang mở'}</p></header><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Doanh thu', data.totals.revenueVnd], ['Đã thu', data.totals.collectedVnd], ['Chi phí duyệt', data.totals.approvedExpenseVnd], ['Nợ mới', data.totals.newDebtVnd]].map(([label, value]) => <article className="rounded-2xl border border-slate-200 bg-white p-4" key={String(label)}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-950">{currency.format(Number(value))} đ</p></article>)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Tồn đầu', data.totals.openingBags], ['Sản xuất', data.totals.productionBags], ['Đã bán', data.totals.soldBags], ['Tồn cuối', data.totals.closingBags], ['Chênh lệch', data.totals.differenceBags]].map(([label, value]) => <article className="rounded-2xl border border-slate-200 bg-white p-4" key={String(label)}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold text-slate-950">{value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} bao`}</p></article>)}</div><CheckList checks={data.checks} />{data.status === 'locked' ? <ReopenDayDialog day={day} /> : <>{reviewRequired && data.lossReportId && data.lossReportVersion ? <ConfirmLossWarningButton expectedVersion={data.lossReportVersion} reportId={data.lossReportId} /> : null}{!hasBlock ? <LockDayDialog day={day} /> : null}</>}</section>
}
