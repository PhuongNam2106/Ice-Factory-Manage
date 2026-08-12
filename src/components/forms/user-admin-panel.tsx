'use client'

import { useState, useTransition } from 'react'
import { createUser, resetUserPin, setUserActive } from '@/modules/admin/users/actions'

type Profile = {
  id: string
  phone: string
  full_name: string
  role: 'employee' | 'manager'
  is_active: boolean
}

export function UserAdminPanel({ profiles }: { profiles: Profile[] }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitCreate(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await createUser({
        fullName: String(formData.get('fullName') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        pin: String(formData.get('pin') ?? ''),
        role: formData.get('role') === 'manager' ? 'manager' : 'employee',
      })
      setMessage(result.success ? 'Đã tạo tài khoản.' : result.error)
    })
  }

  function changeActive(userId: string, isActive: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await setUserActive({ userId, isActive })
      setMessage(result.success ? 'Đã cập nhật trạng thái tài khoản.' : result.error)
    })
  }

  function submitReset(userId: string, formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await resetUserPin({ userId, pin: String(formData.get('pin') ?? '') })
      setMessage(result.success ? 'Đã đặt lại mã PIN.' : result.error)
    })
  }

  return (
    <div className="space-y-8">
      <form action={submitCreate} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2" noValidate>
        <h2 className="sm:col-span-2 text-lg font-semibold">Tạo tài khoản</h2>
        <label className="grid gap-1 text-sm font-medium">Họ tên<input className="rounded-lg border border-slate-300 px-3 py-2" name="fullName" required /></label>
        <label className="grid gap-1 text-sm font-medium">Số điện thoại<input className="rounded-lg border border-slate-300 px-3 py-2" inputMode="tel" name="phone" required type="tel" /></label>
        <label className="grid gap-1 text-sm font-medium">Mã PIN<input className="rounded-lg border border-slate-300 px-3 py-2" inputMode="numeric" minLength={6} name="pin" required type="password" /></label>
        <label className="grid gap-1 text-sm font-medium">Vai trò<select className="rounded-lg border border-slate-300 px-3 py-2" defaultValue="employee" name="role"><option value="employee">Nhân viên</option><option value="manager">Quản lý</option></select></label>
        <button className="rounded-lg bg-sky-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60 sm:col-span-2" disabled={isPending} type="submit">Tạo tài khoản</button>
      </form>
      {message ? <p aria-live="polite" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status">{message}</p> : null}
      <section aria-labelledby="users-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 id="users-title" className="border-b border-slate-200 px-5 py-4 text-lg font-semibold">Tài khoản hiện có</h2>
        <ul className="divide-y divide-slate-200">
          {profiles.map((profile) => (
            <li className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between" key={profile.id}>
              <div><p className="font-semibold">{profile.full_name}</p><p className="text-sm text-slate-600">{profile.phone} · {profile.role === 'manager' ? 'Quản lý' : 'Nhân viên'} · {profile.is_active ? 'Đang hoạt động' : 'Đã ngừng'}</p></div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" disabled={isPending} onClick={() => changeActive(profile.id, !profile.is_active)} type="button">{profile.is_active ? 'Ngừng hoạt động' : 'Kích hoạt'}</button>
                <form action={(formData) => submitReset(profile.id, formData)}><label className="sr-only" htmlFor={`pin-${profile.id}`}>Mã PIN mới cho {profile.full_name}</label><div className="flex gap-2"><input className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" id={`pin-${profile.id}`} inputMode="numeric" minLength={6} name="pin" placeholder="PIN mới" required type="password" /><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" disabled={isPending} type="submit">Đặt lại PIN</button></div></form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
