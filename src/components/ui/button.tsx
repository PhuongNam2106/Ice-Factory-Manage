'use client'

import React, { forwardRef } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    type = 'button',
    ...props
  },
  ref,
) {
  const variantStyles = {
    primary:
      'bg-sky-700 text-white hover:bg-sky-800 shadow-2xs active:bg-sky-900 border border-transparent',
    secondary:
      'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300',
    outline:
      'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200 hover:border-sky-300',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs active:bg-rose-800 border border-transparent',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs active:bg-emerald-800 border border-transparent',
  }

  const sizeStyles = {
    sm: 'min-h-9 px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'min-h-11 px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'min-h-12 px-5 py-3 text-base rounded-2xl gap-2.5',
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-bold tracking-tight select-none touch-manipulation transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  )
})
