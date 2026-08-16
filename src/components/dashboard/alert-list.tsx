'use client'

import { useState } from 'react'
import type { OperationalAlert } from '@/modules/reporting/types'

export function AlertList({ alerts, filterable = false }: { alerts: OperationalAlert[]; filterable?: boolean }) {
  const [filter, setFilter] = useState<'all' | OperationalAlert['severity']>('all')
  const visible = filter === 'all' ? alerts : alerts.filter((alert) => alert.severity === filter)
  const labels = { all: 'Tất cả', danger: 'Khẩn cấp', warning: 'Cần chú ý', info: 'Thông tin' } as const
  return <section aria-labelledby="alerts-title" className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-slate-950" id="alerts-title">Cảnh báo vận hành</h2>{filterable ? <div aria-label="Lọc cảnh báo" className="flex flex-wrap gap-1">{(['all', 'danger', 'warning', 'info'] as const).map((item) => <button aria-pressed={filter === item} className={`min-h-11 touch-manipulation rounded-xl px-3 text-xs font-bold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${filter === item ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-white text-slate-600'}`} key={item} onClick={() => setFilter(item)} type="button">{labels[item]}</button>)}</div> : null}</div><ul className="space-y-2">{visible.map((alert) => <li className={`break-words rounded-2xl border p-4 text-sm font-semibold ${alert.severity === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-900' : alert.severity === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-900'}`} key={alert.code}>{alert.message}</li>)}</ul>{visible.length === 0 ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Không có cảnh báo trong nhóm này.</p> : null}</section>
}
