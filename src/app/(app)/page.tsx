import Link from 'next/link'
import { AlertList } from '@/components/dashboard/alert-list'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { SalesProductionChart } from '@/components/dashboard/sales-production-chart'
import { getDailyDashboard } from '@/modules/reporting/dashboard-service'
import { getOperatingDay } from '@/modules/shared/operating-day'

const currency = new Intl.NumberFormat('vi-VN')
const date = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
})

export default async function HomePage() {
  const day = getOperatingDay(new Date())
  const dashboard = await getDailyDashboard(day)
  const displayDay = date.format(new Date(`${day}T12:00:00+07:00`))
  const stockCountNote = dashboard.stockExpectedBags == null
    ? 'Chưa có số tồn theo sổ'
    : `Theo sổ ${dashboard.stockExpectedBags} bao · Lệch ${dashboard.stockVarianceBags ?? 0} bao (${dashboard.stockVariancePct ?? 0}%)`
  return <section className="space-y-7" aria-labelledby="today-title"><header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-700"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${dashboard.status === 'locked' ? 'bg-slate-500' : 'bg-emerald-500'}`} />{dashboard.status === 'locked' ? 'Đã khóa sổ' : 'Đang vận hành'} · {displayDay}</div><h1 className="mt-2 text-pretty text-3xl font-black tracking-tight text-slate-950 sm:text-4xl" id="today-title">Nhịp xưởng hôm nay</h1><p className="mt-1 max-w-2xl text-pretty text-sm text-slate-600">Sản xuất, bán hàng, tiền thu và tồn kho được tính trực tiếp từ chứng từ.</p></div><Link className="min-h-12 rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" href="/alerts">{dashboard.alerts.length} cảnh báo</Link></header><QuickActions /><section aria-label="Chỉ số chính" className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KpiCard label="Doanh thu" note={`Sỉ ${currency.format(dashboard.wholesaleRevenueVnd)} · Lẻ ${currency.format(dashboard.retailRevenueVnd)}`} tone="dark" value={`${currency.format(dashboard.revenueVnd)} đ`} /><KpiCard label="Lợi nhuận tạm tính" note="Doanh thu trừ chi phí đã duyệt" tone="good" value={`${currency.format(dashboard.officialProfitVnd)} đ`} /><KpiCard label="Tồn thành phẩm" note={`Đầu ngày ${dashboard.openingStockBags} bao`} value={`${dashboard.stockBalanceBags} bao`} /><KpiCard label="Tổng công nợ" note={`Nợ mới ${currency.format(dashboard.newDebtVnd)} đ`} tone={dashboard.overdueDebtVnd > 0 ? 'warn' : 'plain'} value={`${currency.format(dashboard.totalDebtVnd)} đ`} /></section><div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]"><SalesProductionChart productionBags={dashboard.productionBags} soldBags={dashboard.soldBags} /><section className="grid grid-cols-2 gap-3"><KpiCard label="Đã thu" value={`${currency.format(dashboard.collectedVnd)} đ`} /><KpiCard label="Chi phí duyệt" value={`${currency.format(dashboard.approvedExpenseVnd)} đ`} /><KpiCard label="Chi phí chờ" tone={dashboard.pendingExpenseVnd > 0 ? 'warn' : 'plain'} value={`${currency.format(dashboard.pendingExpenseVnd)} đ`} /><KpiCard label="Kiểm kho" note={stockCountNote} value={dashboard.stockActualBags == null ? 'Chưa kiểm' : `${dashboard.stockActualBags} bao`} /></section></div><AlertList alerts={dashboard.alerts.slice(0, 4)} /></section>
}
