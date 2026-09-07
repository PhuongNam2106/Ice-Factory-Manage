'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { OperationalAlert } from '@/modules/reporting/types'
import {
  ArrowRight,
  CheckCircle,
  Info,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react'

export function AlertList({
  alerts,
  filterable = false,
}: {
  alerts: OperationalAlert[]
  filterable?: boolean
}) {
  const [filter, setFilter] = useState<'all' | OperationalAlert['severity']>('all')
  const visible =
    filter === 'all' ? alerts : alerts.filter((alert) => alert.severity === filter)

  const labels = {
    all: 'Tất cả',
    danger: 'Khẩn cấp',
    warning: 'Cần chú ý',
    info: 'Thông tin',
  } as const

  const severityStyles = {
    danger: {
      container: 'border-rose-200 bg-rose-50/80 text-rose-950 hover:bg-rose-100/70',
      icon: <WarningCircle className="h-5 w-5 shrink-0 text-rose-600" weight="fill" />,
      badge: 'border-rose-300 bg-rose-100 text-rose-800',
    },
    warning: {
      container:
        'border-amber-200 bg-amber-50/80 text-amber-950 hover:bg-amber-100/70',
      icon: <Warning className="h-5 w-5 shrink-0 text-amber-600" weight="fill" />,
      badge: 'border-amber-300 bg-amber-100 text-amber-800',
    },
    info: {
      container: 'border-sky-200 bg-sky-50/80 text-sky-950 hover:bg-sky-100/70',
      icon: <Info className="h-5 w-5 shrink-0 text-sky-600" weight="fill" />,
      badge: 'border-sky-300 bg-sky-100 text-sky-800',
    },
  }

  return (
    <section aria-labelledby="alerts-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2
            className="text-base font-extrabold text-slate-950 sm:text-lg"
            id="alerts-title"
          >
            Cảnh báo vận hành
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
            {alerts.length}
          </span>
        </div>

        {filterable ? (
          <div aria-label="Lọc cảnh báo" className="flex flex-wrap gap-1.5">
            {(['all', 'danger', 'warning', 'info'] as const).map((item) => (
              <button
                aria-pressed={filter === item}
                className={`min-h-10 touch-manipulation rounded-xl px-3 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                  filter === item
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {labels[item]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ul className="space-y-2.5">
        {visible.map((alert) => {
          const config = severityStyles[alert.severity]

          return (
            <li
              key={alert.code}
              className={`rounded-2xl border transition-all ${config.container}`}
            >
              {alert.href ? (
                <Link
                  className="flex min-h-12 items-center justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                  href={alert.href}
                >
                  <div className="flex items-center gap-3">
                    {config.icon}
                    <span className="text-sm font-bold leading-tight">
                      {alert.message}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-sky-800">
                    <span className="hidden sm:inline">Xử lý ngay</span>
                    <ArrowRight className="h-4 w-4" weight="bold" />
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-4">
                  {config.icon}
                  <span className="text-sm font-bold leading-tight">
                    {alert.message}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {visible.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-bold text-emerald-900">
          <CheckCircle className="h-5 w-5 text-emerald-600" weight="fill" />
          <span>Không có cảnh báo nào trong nhóm này. Dữ liệu vận hành ổn định.</span>
        </div>
      ) : null}
    </section>
  )
}
