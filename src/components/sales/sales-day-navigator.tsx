import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
} from '@phosphor-icons/react/dist/ssr'
import { shiftSalesOperatingDay } from '@/modules/sales/day-selection'

type SalesDayNavigatorProps = {
  currentDay: string
  selectedDay: string
}

const navigationClassName =
  'inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2'

export function SalesDayNavigator({
  currentDay,
  selectedDay,
}: SalesDayNavigatorProps) {
  const isCurrentDay = selectedDay === currentDay
  const previousDay = shiftSalesOperatingDay(selectedDay, -1)
  const nextDay = shiftSalesOperatingDay(selectedDay, 1)

  return (
    <section
      aria-labelledby="sales-day-navigation-title"
      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-700">
            <CalendarBlank aria-hidden="true" size={20} weight="duotone" />
            <h2
              className="font-extrabold text-slate-950"
              id="sales-day-navigation-title"
            >
              Chọn ngày bán hàng
            </h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Một ngày vận hành được tính từ 20:00 đến trước 20:00 hôm sau.
          </p>
        </div>

        <form
          action="/sales"
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          method="get"
        >
          <label className="sr-only" htmlFor="sales-operating-day">
            Chọn ngày vận hành
          </label>
          <input
            autoComplete="off"
            className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
            defaultValue={selectedDay}
            id="sales-operating-day"
            key={selectedDay}
            max={currentDay}
            name="day"
            required
            type="date"
          />
          <button
            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-bold text-white transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            type="submit"
          >
            Mở ngày
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Link
          aria-label="Ngày trước"
          className={navigationClassName}
          href={`/sales?day=${previousDay}`}
        >
          <ArrowLeft aria-hidden="true" size={16} weight="bold" />
          Ngày trước
        </Link>

        {isCurrentDay ? (
          <span
            aria-disabled="true"
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-400"
          >
            Ngày sau
            <ArrowRight aria-hidden="true" size={16} weight="bold" />
          </span>
        ) : (
          <Link
            aria-label="Ngày sau"
            className={navigationClassName}
            href={`/sales?day=${nextDay}`}
          >
            Ngày sau
            <ArrowRight aria-hidden="true" size={16} weight="bold" />
          </Link>
        )}

        {!isCurrentDay ? (
          <Link
            className="ml-auto inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            href="/sales"
          >
            Về hôm nay
          </Link>
        ) : (
          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            Đang xem hôm nay
          </span>
        )}
      </div>
    </section>
  )
}
