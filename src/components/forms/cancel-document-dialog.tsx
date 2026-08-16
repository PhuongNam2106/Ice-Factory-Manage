'use client'

import { useState, useTransition } from 'react'
import { cancelDocument } from '@/modules/shared/cancellation-actions'
import type { CancelDocumentInput } from '@/modules/shared/version-conflict'

export function CancelDocumentDialog({ entityType, entityId, version, label }: {
  entityType: CancelDocumentInput['entityType']; entityId: string; version: number; label: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    setMessage(null)
    startTransition(async () => {
      const result = await cancelDocument({ entityType, entityId, expectedVersion: version, reason })
      if (result.ok) { setMessage('Đã hủy chứng từ và ghi bút toán đảo.'); setOpen(false) }
      else setMessage(result.error.message)
    })
  }

  return <div className="text-left">{open ? <div aria-labelledby={`cancel-title-${entityId}`} aria-modal="true" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="alertdialog"><h3 className="font-extrabold text-rose-950" id={`cancel-title-${entityId}`}>Xác nhận hủy {label}</h3><p className="text-xs text-rose-800">Dữ liệu không bị xóa. Hệ thống tạo bút toán đảo và lưu lý do vào lịch sử audit.</p><label className="block text-xs font-bold text-rose-950">Lý do hủy<textarea autoComplete="off" className="mt-1 min-h-20 w-full rounded-xl border border-rose-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" maxLength={500} minLength={5} name="cancelReason" onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Khách báo hủy đơn giao đá…" required value={reason} /></label><div className="grid grid-cols-2 gap-2"><button className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500" disabled={pending} onClick={() => setOpen(false)} type="button">Giữ chứng từ</button><button className="min-h-11 rounded-xl bg-rose-700 px-3 text-sm font-bold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2" disabled={pending || reason.trim().length < 5} onClick={confirm} type="button">{pending ? 'Đang hủy…' : 'Hủy và ghi bút toán đảo'}</button></div></div> : <button className="min-h-11 rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" onClick={() => setOpen(true)} type="button">Hủy chứng từ</button>}{message ? <p aria-live="polite" className="mt-2 max-w-sm text-xs font-semibold text-slate-700">{message}</p> : null}</div>
}
