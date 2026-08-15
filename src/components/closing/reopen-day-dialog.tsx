'use client'

import { useState, useTransition } from 'react'
import { reopenDay } from '@/modules/closing/actions'

export function ReopenDayDialog({ day }: { day: string }) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function reopen() { startTransition(async () => { const result = await reopenDay(day, reason); setMessage(result.ok ? 'Đã mở lại ngày vận hành.' : result.error.message) }) }
  return <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-extrabold text-amber-950">Mở lại ngày</h2><textarea className="min-h-24 w-full rounded-2xl border border-amber-300 bg-white p-3" maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Lý do mở lại (bắt buộc)" value={reason} />{message ? <p aria-live="polite" className="text-sm font-semibold">{message}</p> : null}<button className="min-h-12 w-full rounded-2xl bg-amber-700 px-4 font-bold text-white" disabled={pending || !reason.trim()} onClick={reopen} type="button">{pending ? 'Đang mở…' : 'Mở lại ngày'}</button></div>
}
