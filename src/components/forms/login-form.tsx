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
    <form action={onSubmit} className="space-y-5" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="username">
          Tên tài khoản
        </label>
        <input
          autoCapitalize="none"
          autoComplete="username"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none ring-sky-600 focus:ring-2"
          id="username"
          inputMode="text"
          name="username"
          placeholder="nhanvien01"
          required
          spellCheck={false}
          type="text"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="password">
          Mật khẩu
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg tracking-[0.25em] outline-none ring-sky-600 focus:ring-2"
          id="password"
          inputMode="numeric"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p aria-live="polite" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  )
}
