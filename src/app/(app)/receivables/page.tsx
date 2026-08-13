import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AgingTable } from '@/components/receivables/aging-table'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { listCustomerDebtSummaries } from '@/modules/receivables/repository'

const currency = new Intl.NumberFormat('vi-VN')

export default async function ReceivablesPage() {
  const operatingDay = getOperatingDay(new Date())
  const supabase = await createServerSupabaseClient()
  await ensureOperatingDay(operatingDay, supabase)
  const debtSummaries = await listCustomerDebtSummaries(supabase, operatingDay)

  const totalOutstandingAll = debtSummaries.reduce((sum, item) => sum + item.totalOutstandingVnd, 0)
  const totalOverdueAll = debtSummaries.reduce((sum, item) => sum + item.overdueVnd, 0)

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Ngày vận hành {operatingDay}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Công Nợ & Thu Nợ
          </h1>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-6 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Tổng Công Nợ Phải Thu</p>
          <p className="mt-2 text-2xl font-black text-sky-950 sm:text-3xl">{currency.format(totalOutstandingAll)} VNĐ</p>
          <p className="mt-1 text-xs text-sky-700">Từ {debtSummaries.length} khách hàng sỉ</p>
        </div>

        <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Tổng Nợ Quá Hạn Cần Thu</p>
          <p className="mt-2 text-2xl font-black text-rose-950 sm:text-3xl">{currency.format(totalOverdueAll)} VNĐ</p>
          <p className="mt-1 text-xs text-rose-700">Các khoản nợ đã vượt hạn trả quy định</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Danh Sách Công Nợ Theo Khách Hàng
        </h2>
        <AgingTable summaries={debtSummaries} />
      </div>
    </section>
  )
}
