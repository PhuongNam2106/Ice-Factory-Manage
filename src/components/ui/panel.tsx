import React from 'react'

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function Panel({
  children,
  padding = 'md',
  header,
  footer,
  className = '',
  ...props
}: PanelProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs sm:rounded-3xl ${className}`}
      {...props}
    >
      {header ? (
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          {header}
        </div>
      ) : null}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer ? (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
