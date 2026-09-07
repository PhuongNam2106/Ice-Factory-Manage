import Link from 'next/link'
import { AlertList } from '@/components/dashboard/alert-list'
import { CashFlowComparisonChart } from '@/components/dashboard/cash-flow-comparison-chart'
import { IceFlowDiagram } from '@/components/dashboard/ice-flow-diagram'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RevenueBreakdownChart } from '@/components/dashboard/revenue-breakdown-chart'
import { StatusBadge } from '@/components/ui/status-badge'
import { getDailyDashboard } from '@/modules/reporting/dashboard-service'
import { getOperatingDay } from '@/modules/shared/operating-day'
import {
  ArrowRight,
  BellRinging,
  Coins,
  CurrencyCircleDollar,
  HandCoins,
  Package,
  Receipt,
  Scales,
} from '@phosphor-icons/react/dist/ssr'

const currency = new Intl.NumberFormat('vi-VN')
const date = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Bangkok',
})

export default async function HomePage() {
  const day = getOperatingDay(new Date())
  const dashboard = await getDailyDashboard(day)
  const displayDay = date.format(new Date(`${day}T12:00:00+07:00`))

  const closingNote =
    dashboard.expectedClosingBags == null
      ? 'Chưa có tồn dự kiến'
      : `Dự kiến: ${dashboard.expectedClosingBags.toLocaleString('vi-VN')} bao`

  const rate =
    dashboard.differencePct == null
      ? null
      : `${dashboard.differencePct.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`

  const lossLabel = (dashboard.differenceBags ?? 0) < 0 ? 'Dư kho' : 'Hao hụt'
  const lossValue = !dashboard.lossReportExists
    ? 'Chưa đối soát'
    : dashboard.productionBags === 0
      ? 'Không phát sinh SX'
      : `${Math.abs(dashboard.differenceBags ?? 0).toLocaleString('vi-VN')} bao · ${rate ?? ''}`

  const lossNote = dashboard.lossReportStale
    ? 'Số liệu đổi · cần lưu lại'
    : `Ngưỡng cảnh báo: ${dashboard.lossWarningPct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`

  const isLossWarning = dashboard.lossRequiresReview || dashboard.lossReportStale

  return (
    <section className="space-y-7" aria-labelledby="today-title">
      {/* 1. Trạng thái ngày vận hành và cảnh báo */}
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={dashboard.status === 'locked' ? 'locked' : 'running'}
              label={dashboard.status === 'locked' ? 'Đã khóa sổ' : 'Đang vận hành'}
              size="sm"
            />
            <span className="text-xs font-bold text-slate-500">
              Ngày vận hành {displayDay} (20:00 → 20:00)
            </span>
          </div>

          <h1
            className="mt-2 text-pretty text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl"
            id="today-title"
          >
            Nhịp xưởng hôm nay
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-xs text-slate-600 sm:text-sm">
            Sản xuất thực tế, bán hàng sỉ/lẻ, dòng tiền thu và đối soát hao hụt kho đá.
          </p>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-between gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:self-end"
          href="/alerts"
        >
          <div className="flex items-center gap-2">
            <BellRinging className="h-4 w-4 text-amber-600" weight="fill" />
            <span>{dashboard.alerts.length} cảnh báo vận hành</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" weight="bold" />
        </Link>
      </header>

      {/* 2. Các thao tác nhập nhanh */}
      <QuickActions />

      {/* 3. KPI quan trọng */}
      <section aria-label="Chỉ số chính trong ngày" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Chỉ số kinh doanh & kho
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Doanh thu"
            note={`Sỉ: ${currency.format(dashboard.wholesaleRevenueVnd)} đ · Lẻ: ${currency.format(dashboard.retailRevenueVnd)} đ`}
            tone="brand"
            icon={<CurrencyCircleDollar className="h-4 w-4 text-sky-700" weight="bold" />}
            value={`${currency.format(dashboard.revenueVnd)} đ`}
          />

          <KpiCard
            label="Lợi nhuận tạm tính"
            note="Doanh thu trừ chi phí đã duyệt"
            tone="good"
            icon={<Coins className="h-4 w-4 text-emerald-700" weight="bold" />}
            value={`${currency.format(dashboard.officialProfitVnd)} đ`}
          />

          <KpiCard
            label="Tồn cuối thực tế"
            note={closingNote}
            tone={dashboard.closingBags == null ? 'warn' : 'plain'}
            icon={<Package className="h-4 w-4 text-slate-500" weight="bold" />}
            value={
              dashboard.closingBags == null
                ? 'Chưa nhập'
                : `${dashboard.closingBags.toLocaleString('vi-VN')} bao`
            }
          />

          <KpiCard
            label="Tổng công nợ"
            note={`Nợ mới: ${currency.format(dashboard.newDebtVnd)} đ`}
            tone={dashboard.overdueDebtVnd > 0 ? 'warn' : 'plain'}
            icon={<HandCoins className="h-4 w-4 text-slate-500" weight="bold" />}
            value={`${currency.format(dashboard.totalDebtVnd)} đ`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Tiền đã thu"
            note="Thực thu trong ngày"
            value={`${currency.format(dashboard.collectedVnd)} đ`}
          />

          <KpiCard
            label="Chi phí đã duyệt"
            note="Tính vào lợi nhuận chính thức"
            value={`${currency.format(dashboard.approvedExpenseVnd)} đ`}
          />

          <KpiCard
            label="Chi phí chờ duyệt"
            note={`${dashboard.pendingExpenseCount} khoản chi cần duyệt`}
            tone={dashboard.pendingExpenseVnd > 0 ? 'warn' : 'plain'}
            icon={<Receipt className="h-4 w-4 text-amber-700" weight="bold" />}
            value={`${currency.format(dashboard.pendingExpenseVnd)} đ`}
          />

          <Link
            className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            href="/loss"
          >
            <KpiCard
              label={lossLabel}
              note={lossNote}
              tone={isLossWarning ? 'danger' : 'plain'}
              icon={<Scales className="h-4 w-4 text-slate-500" weight="bold" />}
              value={lossValue}
            />
          </Link>
        </div>
      </section>

      {/* 4. Ba biểu đồ trực quan */}
      <section aria-label="Biểu đồ trực quan vận hành" className="space-y-4">
        {/* Biểu đồ 1: Sơ đồ dòng đá trong ngày */}
        <IceFlowDiagram
          openingBags={dashboard.openingBags}
          productionBags={dashboard.productionBags}
          soldBags={dashboard.soldBags}
          expectedClosingBags={dashboard.expectedClosingBags}
          closingBags={dashboard.closingBags}
          differenceBags={dashboard.differenceBags}
          differencePct={dashboard.differencePct}
          lossReportExists={dashboard.lossReportExists}
          lossWarningPct={dashboard.lossWarningPct}
          lossRequiresReview={dashboard.lossRequiresReview}
        />

        {/* Biểu đồ 2 & 3: Cơ cấu doanh thu và Dòng tiền */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RevenueBreakdownChart
            wholesaleRevenueVnd={dashboard.wholesaleRevenueVnd}
            retailRevenueVnd={dashboard.retailRevenueVnd}
            totalRevenueVnd={dashboard.revenueVnd}
          />

          <CashFlowComparisonChart
            revenueVnd={dashboard.revenueVnd}
            collectedVnd={dashboard.collectedVnd}
            approvedExpenseVnd={dashboard.approvedExpenseVnd}
            newDebtVnd={dashboard.newDebtVnd}
          />
        </div>
      </section>

      {/* 5. Danh sách cảnh báo vận hành */}
      <AlertList alerts={dashboard.alerts.slice(0, 4)} />
    </section>
  )
}
