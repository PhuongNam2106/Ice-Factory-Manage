import Link from 'next/link'
import { ArrowRight, CalendarBlank, ClockCountdown } from '@phosphor-icons/react/dist/ssr'
import type { IncompleteLossDay } from '@/modules/loss/types'

function incompleteDayNotices(day: IncompleteLossDay) {
  const notices: Array<{ label: string; tone: string }> = []

  if (!day.hasReport) notices.push({ label: 'Chưa nhập tồn cuối', tone: 'border-amber-200 bg-amber-50 text-amber-900' })
  if (day.isStale) notices.push({ label: 'Số liệu đã thay đổi', tone: 'border-rose-200 bg-rose-50 text-rose-800' })
  if (day.pendingHarvestCount > 0) {
    notices.push({
      label: `${day.pendingHarvestCount} lần xả chưa nhập số bao`,
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
    })
  }
  if (day.requiresReview) notices.push({ label: 'Chờ quản lý xác nhận', tone: 'border-rose-200 bg-rose-50 text-rose-800' })
  if (notices.length === 0) notices.push({ label: 'Đã nhập tồn cuối, chờ khóa ngày', tone: 'border-sky-200 bg-sky-50 text-sky-800' })

  return notices
}

type LossDayNavigatorProps = {
  currentDay: string
  days: IncompleteLossDay[]
  firstOperatingDay: string
  selectedDay: string
}

export function LossDayNavigator({ currentDay, days, firstOperatingDay, selectedDay }: LossDayNavigatorProps) {
  return (
    <section aria-labelledby="loss-day-navigation-title" className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)] lg:p-5">
      <div>
        <div className="flex items-center gap-2 text-sky-700">
          <CalendarBlank aria-hidden="true" size={20} weight="duotone" />
          <h2 className="font-extrabold text-slate-950" id="loss-day-navigation-title">Chọn ngày đối soát</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">Có thể mở lại ngày cũ để nhập tồn cuối hoặc xem số liệu. Ngày đã khóa chỉ được xem.</p>
        <form action="/loss" className="mt-4 flex flex-col gap-2 sm:flex-row" method="get">
          <label className="sr-only" htmlFor="loss-operating-day">Chọn ngày vận hành</label>
          <input
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            defaultValue={selectedDay}
            id="loss-operating-day"
            max={currentDay}
            min={firstOperatingDay}
            name="day"
            required
            type="date"
          />
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" type="submit">
            Mở ngày
            <ArrowRight aria-hidden="true" size={15} weight="bold" />
          </button>
        </form>
      </div>

      <div className="min-w-0 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClockCountdown aria-hidden="true" className="text-amber-700" size={20} weight="duotone" />
            <h2 className="font-extrabold text-slate-950">Ngày chưa hoàn tất</h2>
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-500">{days.length} ngày</span>
        </div>
        {days.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {days.map((day) => (
              <Link
                aria-current={day.operatingDay === selectedDay ? 'page' : undefined}
                aria-label={`Mở ngày ${day.operatingDay}`}
                className={`min-w-0 rounded-xl border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${day.operatingDay === selectedDay ? 'border-sky-400 bg-sky-50/70' : 'border-slate-200 bg-slate-50/50 hover:border-sky-300 hover:bg-sky-50'}`}
                href={`/loss?day=${day.operatingDay}`}
                key={day.operatingDay}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold tabular-nums text-slate-950">Ngày {day.operatingDay}</span>
                  {day.operatingDay === currentDay ? <span className="text-[11px] font-bold text-sky-700">Hiện tại</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {incompleteDayNotices(day).map((notice) => (
                    <span className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${notice.tone}`} key={notice.label}>{notice.label}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">Không có ngày nào đang chờ hoàn tất.</p>
        )}
      </div>
    </section>
  )
}
