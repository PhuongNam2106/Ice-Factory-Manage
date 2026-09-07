import { AlertList } from '@/components/dashboard/alert-list'
import { PageHeader } from '@/components/ui/page-header'
import { getDailyDashboard } from '@/modules/reporting/dashboard-service'
import { getOperatingDay } from '@/modules/shared/operating-day'

const date = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Bangkok',
})

export default async function AlertsPage() {
  const day = getOperatingDay(new Date())
  const dashboard = await getDailyDashboard(day)
  const displayDay = date.format(new Date(`${day}T12:00:00+07:00`))

  return (
    <section className="space-y-6">
      <PageHeader
        badge={`Ngày ${displayDay}`}
        description="Cảnh báo giúp đối chiếu và kiểm soát rủi ro vận hành; không tự động chặn nhân viên nhập chứng từ"
        title="Danh Sách Cảnh Báo"
      />
      <AlertList alerts={dashboard.alerts} filterable />
    </section>
  )
}

