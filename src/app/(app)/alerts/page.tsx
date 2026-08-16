import { AlertList } from '@/components/dashboard/alert-list'
import { getDailyDashboard } from '@/modules/reporting/dashboard-service'
import { getOperatingDay } from '@/modules/shared/operating-day'

const date = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
})

export default async function AlertsPage() {
  const day = getOperatingDay(new Date())
  const dashboard = await getDailyDashboard(day)
  const displayDay = date.format(new Date(`${day}T12:00:00+07:00`))
  return <section className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Ngày {displayDay}</p><h1 className="mt-1 text-pretty text-3xl font-black text-slate-950">Cảnh báo</h1><p className="mt-1 max-w-prose text-pretty text-sm text-slate-600">Cảnh báo giúp đối chiếu; không tự động chặn nhân viên nhập chứng từ.</p></header><AlertList alerts={dashboard.alerts} filterable /></section>
}
