import React from 'react'
import { Tray } from '@phosphor-icons/react/dist/ssr'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:rounded-3xl sm:p-12 ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-2xs">
        {icon ?? <Tray className="h-6 w-6" weight="duotone" />}
      </div>
      <p className="text-base font-bold text-slate-900">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
