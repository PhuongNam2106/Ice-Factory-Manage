import { DailyLossForm } from '@/components/forms/daily-loss-form'
import { LossHistory } from '@/components/loss/loss-history'
import { LossSummary } from '@/components/loss/loss-summary'
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
    <section className="space-y-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Ngày vận hành {operatingDay}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Theo dõi hao hụt sản xuất</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Đối chiếu tồn đầu, sản lượng máy, tổng bán sỉ/lẻ và tồn cuối thực tế theo một ngày từ 20:00 đến 20:00 hôm sau.</p>
      </header>

      {report.ok ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)] xl:items-start">
          <LossSummary report={report.data} />
          <DailyLossForm report={report.data} />
        </div>
      ) : (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-950" role="alert">
          <h2 className="font-extrabold">Chưa thể mở đối soát hao hụt</h2>
          <p className="mt-1 text-sm">{report.error.message}</p>
        </div>
      )}

      <LossHistory items={history} />
    </section>
  )
}
