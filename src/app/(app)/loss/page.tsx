import { DailyLossForm } from '@/components/forms/daily-loss-form'
import { LossHistory } from '@/components/loss/loss-history'
import { LossSummary } from '@/components/loss/loss-summary'
import { PageHeader } from '@/components/ui/page-header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { listDailyLossReports } from '@/modules/loss/repository'
import { getDailyLossReport } from '@/modules/loss/service'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function LossPage() {
  await requireUser()
  const operatingDay = getOperatingDay(new Date())
  const client = await createServerSupabaseClient()
  const [report, history] = await Promise.all([
    getDailyLossReport(operatingDay, client),
    listDailyLossReports(client),
  ])

  return (
    <section className="space-y-6">
      <PageHeader
        badge={`Ngày vận hành ${operatingDay}`}
        description="Đối chiếu tồn đầu, sản lượng máy, tổng bán sỉ/lẻ và tồn cuối thực tế theo chu kỳ [20:00 - 20:00)"
        title="Theo Dõi Hao Hụt Sản Xuất"
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
