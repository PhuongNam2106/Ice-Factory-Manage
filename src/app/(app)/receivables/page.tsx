import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AgingTable } from '@/components/receivables/aging-table'
import { PageHeader } from '@/components/ui/page-header'
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
      <PageHeader
        badge={`Ngày vận hành ${operatingDay}`}
        description="Theo dõi nợ khách hàng, kiểm soát nợ quá hạn và lập phiếu thu tiền"
        title="Công Nợ & Thu Nợ"
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/70 to-white p-6 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-800">Tổng Công Nợ Phải Thu</p>
          <p className="mt-2 text-2xl font-black text-sky-950 sm:text-3xl tabular-nums">{currency.format(totalOutstandingAll)} VNĐ</p>
          <p className="mt-1 text-xs text-sky-700 font-medium">Từ {debtSummaries.length} khách hàng sỉ</p>
        </div>

        <div className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50/70 to-white p-6 shadow-2xs">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Tổng Nợ Quá Hạn Cần Thu</p>
          <p className="mt-2 text-2xl font-black text-rose-950 sm:text-3xl tabular-nums">{currency.format(totalOverdueAll)} VNĐ</p>
          <p className="mt-1 text-xs text-rose-700 font-medium">Các khoản nợ đã vượt hạn trả quy định</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Danh Sách Công Nợ Theo Khách Hàng
        </h2>
        <AgingTable summaries={debtSummaries} />
      </div>
    </section>
  )
}
