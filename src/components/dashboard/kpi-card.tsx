import React from 'react'

export interface KpiCardProps {
  label: string
  value: string
  note?: string
  tone?: 'plain' | 'brand' | 'dark' | 'good' | 'warn' | 'danger'
  icon?: React.ReactNode
}

export function KpiCard({
  label,
  value,
  note,
  tone = 'plain',
  icon,
}: KpiCardProps) {
  const tones = {
    plain: {
      card: 'border-slate-200/90 bg-white text-slate-950 shadow-2xs',
      label: 'text-slate-500',
      value: 'text-slate-950',
      note: 'text-slate-500',
    },
    brand: {
      card: 'border-sky-200/90 bg-sky-50/60 text-sky-950 shadow-2xs',
      label: 'text-sky-700',
      value: 'text-sky-950',
      note: 'text-sky-600',
    },
    dark: {
      card: 'border-slate-900 bg-slate-950 text-white shadow-md shadow-slate-950/10',
      label: 'text-slate-400',
      value: 'text-white',
      note: 'text-slate-300',
    },
    good: {
      card: 'border-emerald-200 bg-emerald-50/60 text-emerald-950 shadow-2xs',
      label: 'text-emerald-700',
      value: 'text-emerald-950',
      note: 'text-emerald-700',
    },
    warn: {
      card: 'border-amber-200 bg-amber-50/70 text-amber-950 shadow-2xs',
      label: 'text-amber-800',
      value: 'text-amber-950',
      note: 'text-amber-700',
    },
    danger: {
      card: 'border-rose-200 bg-rose-50/70 text-rose-950 shadow-2xs',
      label: 'text-rose-800',
      value: 'text-rose-950',
      note: 'text-rose-700',
    },
  }

  const current = tones[tone]

  return (
    <article
      className={`min-w-0 rounded-2xl border p-4 transition-all hover:border-slate-300 sm:p-5 ${current.card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${current.label}`}>
          {label}
        </p>
        {icon ? <span className="shrink-0">{icon}</span> : null}
      </div>
      <p
        className={`mt-2 break-words text-2xl font-black tabular-nums tracking-tight sm:text-3xl ${current.value}`}
      >
        {value}
      </p>
      {note ? (
        <p className={`mt-1.5 break-words text-xs font-medium ${current.note}`}>
          {note}
        </p>
      ) : null}
    </article>
  )
}
