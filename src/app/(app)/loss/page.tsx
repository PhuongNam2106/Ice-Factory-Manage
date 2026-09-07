import { DailyLossForm } from '@/components/forms/daily-loss-form'
import { LossDayNavigator } from '@/components/loss/loss-day-navigator'
import { LossHistory } from '@/components/loss/loss-history'
import { LossSummary } from '@/components/loss/loss-summary'
import { PageHeader } from '@/components/ui/page-header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { listDailyLossReports, listIncompleteLossDays } from '@/modules/loss/repository'
import { resolveSelectableLossDay } from '@/modules/loss/schema'
import { getDailyLossReport } from '@/modules/loss/service'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function LossPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  await requireUser()
  const currentDay = getOperatingDay(new Date())
  const params = await searchParams
  const client = await createServerSupabaseClient()
  const [workspace, history] = await Promise.all([
    listIncompleteLossDays(client, currentDay),
    listDailyLossReports(client),
  ])
  const operatingDay = resolveSelectableLossDay(params.day, workspace.firstOperatingDay, currentDay)
  await ensureOperatingDay(operatingDay, client)
  const report = await getDailyLossReport(operatingDay, client)

  return (
    <section className="space-y-6">
      <PageHeader
        badge={`Ngày vận hành ${operatingDay}`}
        description="Đối chiếu tồn đầu, sản lượng máy, tổng bán sỉ/lẻ và tồn cuối thực tế theo chu kỳ [20:00 - 20:00)"
        title="Theo Dõi Hao Hụt Sản Xuất"
      />

      <LossDayNavigator
        currentDay={currentDay}
        days={workspace.days}
        firstOperatingDay={workspace.firstOperatingDay}
        selectedDay={operatingDay}
      />

      {report.ok ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)] xl:items-start">
          <LossSummary report={report.data} />
          <DailyLossForm report={report.data} />
        </div>
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950" role="alert">
          <h2 className="font-extrabold">Chưa thể mở đối soát hao hụt</h2>
          <p className="mt-1 text-sm">{report.error.message}</p>
        </div>
      )}

      <LossHistory items={history} />
    </section>
  )
}
