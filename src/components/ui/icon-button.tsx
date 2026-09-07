'use client'

import React, { forwardRef } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon: React.ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    className = '',
    variant = 'ghost',
    size = 'md',
    isLoading = false,
    disabled = false,
    type = 'button',
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const variantStyles = {
    primary:
      'bg-sky-700 text-white hover:bg-sky-800 shadow-2xs active:bg-sky-900 border border-transparent',
    secondary:
      'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300',
    outline:
      'bg-white text-sky-700 hover:bg-sky-50 border border-sky-200 hover:border-sky-300',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
    danger:
      'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300',
  }

  const sizeStyles = {
    sm: 'h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg text-sm',
    md: 'h-11 w-11 rounded-xl text-base',
    lg: 'h-12 w-12 rounded-2xl text-lg',
  }

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center select-none touch-manipulation transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <CircleNotch className="h-5 w-5 animate-spin" weight="bold" />
      ) : (
        icon
      )}
    </button>
  )
})
