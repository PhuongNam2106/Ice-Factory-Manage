import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { DailyLossForm } from '@/components/forms/daily-loss-form'
import { LossSummary } from '@/components/loss/loss-summary'
import { LossVersionHistory } from '@/components/loss/loss-version-history'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireManager, requireUser } from '@/modules/auth/service'
import { listDailyLossReportVersions } from '@/modules/loss/repository'
import { getDailyLossReport } from '@/modules/loss/service'
import type { DailyLossVersionItem } from '@/modules/loss/types'

export default async function LossDetailPage({ params }: { params: Promise<{ day: string }> }) {
  const user = await requireUser()
  const { day } = await params
  const client = await createServerSupabaseClient()
  const report = await getDailyLossReport(day, client)
  let versions: DailyLossVersionItem[] = []
  if (report.ok && report.data.id && user.role === 'manager') {
    await requireManager()
    versions = await listDailyLossReportVersions(client, report.data.id)
  }

  return (
    <section className="space-y-6">
      <header>
        <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-xl pr-3 text-xs font-bold text-sky-700 hover:text-sky-900 transition" href="/loss">
          <ArrowLeft size={14} weight="bold" />
          <span>Lịch sử hao hụt</span>
        </Link>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-sky-700">Ngày vận hành {day}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Chi Tiết Đối Soát Hao Hụt</h1>
      </header>

      {report.ok ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)] xl:items-start">
            <LossSummary report={report.data} />
            <DailyLossForm report={report.data} />
          </div>
          {user.role === 'manager' ? <LossVersionHistory items={versions} /> : null}
        </>
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950" role="alert">
          <h2 className="font-extrabold">Không thể tải ngày đã chọn</h2>
          <p className="mt-1 text-sm">{report.error.message}</p>
        </div>
      )}
    </section>
  )
}
