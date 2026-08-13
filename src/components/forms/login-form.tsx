'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPassword } from '@/modules/auth/actions'

export function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signInWithPassword({
        username: String(formData.get('username') ?? ''),
        password: String(formData.get('password') ?? ''),
      })

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      router.replace('/')
      router.refresh()
    })
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="username">
          Tên tài khoản
        </label>
        <div className="relative">
          <input
            autoCapitalize="none"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            id="username"
            inputMode="text"
            name="username"
            placeholder="Ví dụ: quanly hoặc nhanvien01"
            required
            spellCheck={false}
            type="text"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="password">
          Mật khẩu
        </label>
        <div className="relative">
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-white tracking-[0.2em] placeholder-slate-500 outline-none transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            id="password"
            inputMode="numeric"
            minLength={6}
            name="password"
            placeholder="••••••"
            required
            type="password"
          />
        </div>
      </div>

      {error ? (
        <div aria-live="polite" className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300" role="alert">
          <svg className="h-4 w-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      <button
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all duration-150 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Đang đăng nhập…</span>
          </>
        ) : (
          <span>Vào hệ thống →</span>
        )}
      </button>
    </form>
  )
}
