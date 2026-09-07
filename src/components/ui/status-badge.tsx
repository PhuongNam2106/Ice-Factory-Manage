import React from 'react'
import {
  CheckCircle,
  Clock,
  Info,
  LockKey,
  LockKeyOpen,
  PlayCircle,
  Snowflake,
  StopCircle,
  Warning,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react/dist/ssr'

export type StatusType =
  | 'running'
  | 'stopped'
  | 'harvesting'
  | 'active'
  | 'cancelled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'locked'
  | 'open'
  | 'danger'
  | 'warning'
  | 'info'

interface StatusConfig {
  label: string
  bg: string
  text: string
  border: string
  icon: React.ReactNode
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  running: {
    label: 'Đang chạy',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: <PlayCircle className="h-3.5 w-3.5 text-emerald-600" weight="fill" />,
  },
  stopped: {
    label: 'Đã tắt',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: <StopCircle className="h-3.5 w-3.5 text-slate-500" weight="fill" />,
  },
  harvesting: {
    label: 'Đang xả đá',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    icon: <Snowflake className="h-3.5 w-3.5 text-sky-600" weight="bold" />,
  },
  active: {
    label: 'Hiệu lực',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" weight="fill" />,
  },
  cancelled: {
    label: 'Đã hủy',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: <XCircle className="h-3.5 w-3.5 text-rose-600" weight="fill" />,
  },
  pending: {
    label: 'Chờ duyệt',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: <Clock className="h-3.5 w-3.5 text-amber-600" weight="bold" />,
  },
  approved: {
    label: 'Đã duyệt',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" weight="fill" />,
  },
  rejected: {
    label: 'Từ chối',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: <XCircle className="h-3.5 w-3.5 text-rose-600" weight="fill" />,
  },
  locked: {
    label: 'Đã khóa',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    icon: <LockKey className="h-3.5 w-3.5 text-slate-600" weight="fill" />,
  },
  open: {
    label: 'Đang mở',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: <LockKeyOpen className="h-3.5 w-3.5 text-emerald-600" weight="fill" />,
  },
  danger: {
    label: 'Khẩn cấp',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: <WarningCircle className="h-3.5 w-3.5 text-rose-600" weight="fill" />,
  },
  warning: {
    label: 'Cần chú ý',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: <Warning className="h-3.5 w-3.5 text-amber-600" weight="fill" />,
  },
  info: {
    label: 'Thông tin',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    icon: <Info className="h-3.5 w-3.5 text-sky-600" weight="fill" />,
  },
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  className = '',
}: {
  status: StatusType
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const config = statusConfigs[status]
  const displayText = label ?? config.label
  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1 font-semibold'
      : 'text-xs px-2.5 py-1 gap-1.5 font-bold'

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span aria-hidden="true" className="shrink-0 flex items-center">
        {config.icon}
      </span>
      <span>{displayText}</span>
    </span>
  )
}
