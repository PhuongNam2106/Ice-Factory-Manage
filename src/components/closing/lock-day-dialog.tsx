'use client'

import { useState, useTransition } from 'react'
import { lockDay } from '@/modules/closing/actions'

export function LockDayDialog({ day }: { day: string }) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function lock() { startTransition(async () => { const result = await lockDay(day); setMessage(result.ok ? 'Đã khóa sổ ngày.' : result.error.message) }) }
  return <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold text-slate-950">Khóa sổ</h2><p className="text-sm text-slate-600">Khóa đồng thời số liệu bán hàng, chi phí, công nợ và sản xuất của ngày này.</p>{message ? <p aria-live="polite" className="text-sm font-semibold">{message}</p> : null}<button className="min-h-12 w-full rounded-2xl bg-slate-950 px-4 font-bold text-white" disabled={pending} onClick={lock} type="button">{pending ? 'Đang khóa…' : 'Khóa sổ ngày'}</button></div>
}
