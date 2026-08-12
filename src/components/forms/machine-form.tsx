'use client'

import { useState, useTransition } from 'react'
import { saveMachine, setMachineActive } from '@/modules/admin/catalog-actions'
import type { MachineRecord } from '@/modules/admin/catalog-service'

export function MachineForm({ machine }: { machine?: MachineRecord }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await saveMachine({ id: machine?.id, name: String(formData.get('name') ?? ''), code: String(formData.get('code') ?? '') })
      setMessage(result.ok ? 'Đã lưu máy.' : result.error.message)
    })
  }

  function changeActive() {
    if (!machine) return
    setMessage(null)
    startTransition(async () => {
      const result = await setMachineActive({ id: machine.id, isActive: !machine.isActive })
      setMessage(result.ok ? 'Đã cập nhật trạng thái máy.' : result.error.message)
    })
  }

  return (
    <form action={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold">{machine ? machine.name : 'Thêm máy sản xuất'}</h2>
        {machine ? <p className="mt-1 text-sm text-slate-600">{machine.isActive ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}</p> : null}
      </div>
      <label className="grid gap-1 text-sm font-medium">Tên máy<input className="min-h-11 rounded-lg border border-slate-300 px-3 py-2" defaultValue={machine?.name} name="name" required /></label>
      <label className="grid gap-1 text-sm font-medium">Mã máy<input className="min-h-11 rounded-lg border border-slate-300 px-3 py-2" defaultValue={machine?.code ?? ''} name="code" /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
        <button className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">{machine ? 'Lưu thay đổi' : 'Thêm máy'}</button>
        {machine ? <button className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-60" disabled={isPending} onClick={changeActive} type="button">{machine.isActive ? 'Ngừng hoạt động' : 'Kích hoạt lại'}</button> : null}
      </div>
      {message ? <p aria-live="polite" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 sm:col-span-2" role="status">{message}</p> : null}
    </form>
  )
}
