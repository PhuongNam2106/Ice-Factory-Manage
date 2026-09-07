import React from 'react'

export interface SectionHeaderProps {
  title: string
  description?: string
  counter?: React.ReactNode
  action?: React.ReactNode
  id?: string
  className?: string
}

export function SectionHeader({
  title,
  description,
  counter,
  action,
  id,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2
            id={id}
            className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg"
          >
            {title}
          </h2>
          {counter ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {counter}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
