import React from 'react'
import {
  CheckCircle,
  Info,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr'

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'success'

export interface AlertBannerProps {
  severity?: AlertSeverity
  title?: string
  message: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function AlertBanner({
  severity = 'info',
  title,
  message,
  action,
  className = '',
}: AlertBannerProps) {
  const styles = {
    info: {
      container: 'border-sky-200 bg-sky-50 text-sky-950',
      icon: <Info className="h-5 w-5 shrink-0 text-sky-700" weight="fill" />,
    },
    warning: {
      container: 'border-amber-200 bg-amber-50 text-amber-950',
      icon: <Warning className="h-5 w-5 shrink-0 text-amber-700" weight="fill" />,
    },
    danger: {
      container: 'border-rose-200 bg-rose-50 text-rose-950',
      icon: <WarningCircle className="h-5 w-5 shrink-0 text-rose-700" weight="fill" />,
    },
    success: {
      container: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      icon: <CheckCircle className="h-5 w-5 shrink-0 text-emerald-700" weight="fill" />,
    },
  }

  const current = styles[severity]
  const role = severity === 'danger' || severity === 'warning' ? 'alert' : 'status'

  return (
    <div
      role={role}
      className={`flex items-start gap-3.5 rounded-2xl border p-4 sm:p-5 ${current.container} ${className}`}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-extrabold">{title}</p> : null}
        <div className={`text-xs leading-relaxed sm:text-sm ${title ? 'mt-1' : ''}`}>
          {message}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
