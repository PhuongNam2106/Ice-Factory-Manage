'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPassword } from '@/modules/auth/actions'
import { ArrowRight, CircleNotch, WarningCircle } from '@phosphor-icons/react'

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
        <label
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
          htmlFor="username"
        >
          Tên tài khoản
        </label>
        <input
          autoCapitalize="none"
          autoComplete="username"
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
          id="username"
          inputMode="text"
          name="username"
          placeholder="Ví dụ: quanly hoặc nhanvien01"
          required
          spellCheck={false}
          type="text"
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
          htmlFor="password"
        >
          Mật khẩu
        </label>
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 tracking-[0.15em] placeholder:tracking-normal placeholder:text-slate-400 shadow-2xs transition-all focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
          id="password"
          inputMode="numeric"
          minLength={6}
          name="password"
          placeholder="••••••"
          required
          type="password"
        />
      </div>

      {error ? (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800"
          role="alert"
        >
          <WarningCircle className="h-4 w-4 shrink-0 text-rose-600" weight="fill" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white shadow-md shadow-sky-700/20 transition-all duration-150 hover:bg-sky-800 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <>
            <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
            <span>Đang đăng nhập…</span>
          </>
        ) : (
          <>
            <span>Vào hệ thống</span>
            <ArrowRight className="h-4 w-4" weight="bold" />
          </>
        )}
      </button>
    </form>
  )
}
