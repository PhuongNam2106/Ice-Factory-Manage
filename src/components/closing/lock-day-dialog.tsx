'use client'

import { useState, useTransition } from 'react'
import { lockDay } from '@/modules/closing/actions'

export function LockDayDialog({ day, needsOverride }: { day: string; needsOverride: boolean }) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function lock() { startTransition(async () => { const result = await lockDay(day, reason); setMessage(result.ok ? 'Đã khóa sổ ngày.' : result.error.message) }) }
  return <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold text-slate-950">Khóa sổ</h2>{needsOverride ? <textarea className="min-h-24 w-full rounded-2xl border border-amber-300 p-3" maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Lý do chấp nhận chênh lệch tồn" value={reason} /> : null}{message ? <p aria-live="polite" className="text-sm font-semibold">{message}</p> : null}<button className="min-h-12 w-full rounded-2xl bg-slate-950 px-4 font-bold text-white" disabled={pending} onClick={lock} type="button">{pending ? 'Đang khóa…' : 'Khóa sổ ngày'}</button></div>
}
