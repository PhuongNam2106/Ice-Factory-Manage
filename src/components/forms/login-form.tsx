'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPin } from '@/modules/auth/actions'

export function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await signInWithPin({
        phone: String(formData.get('phone') ?? ''),
        pin: String(formData.get('pin') ?? ''),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.replace('/')
      router.refresh()
    })
  }

  return (
    <form action={onSubmit} className="space-y-5" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="phone">
          Số điện thoại
        </label>
        <input
          autoComplete="tel"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none ring-sky-600 focus:ring-2"
          id="phone"
          inputMode="tel"
          name="phone"
          placeholder="0912 345 678"
          required
          type="tel"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800" htmlFor="pin">
          Mã PIN
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg tracking-[0.25em] outline-none ring-sky-600 focus:ring-2"
          id="pin"
          inputMode="numeric"
          minLength={6}
          name="pin"
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
