'use client'

import { useState } from 'react'
import { correctProductionAction } from '@/modules/production/actions'
import type { ProductionCorrectionInput } from '@/modules/production/schema'

type Target = { actionType: ProductionCorrectionInput['actionType']; machineId?: string; runId?: string; harvestId?: string; label: string; initialTime?: string }

function bangkokInput(iso?: string) {
  const date = iso ? new Date(iso) : new Date()
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
  return parts.replace(' ', 'T')
}

export function ProductionCorrectionDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  const [occurredAt, setOccurredAt] = useState(bangkokInput(target.initialTime))
  const [bagQuantity, setBagQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null)
    const base = { actionType: target.actionType, occurredAt: `${occurredAt}:00+07:00`, idempotencyKey: crypto.randomUUID() }
    let input: ProductionCorrectionInput
    if (target.actionType === 'add_harvest') input = { ...base, actionType: 'add_harvest', machineId: target.machineId!, ...(bagQuantity === '' ? {} : { bagQuantity }) }
    else if (target.actionType === 'add_start' || target.actionType === 'add_stop') input = { ...base, actionType: target.actionType, machineId: target.machineId! }
    else if (target.actionType === 'change_harvest_time') input = { ...base, actionType: 'change_harvest_time', harvestId: target.harvestId! }
    else input = { ...base, actionType: target.actionType, runId: target.runId! }
    const result = await correctProductionAction(input)
    setBusy(false)
    if (!result.ok) { setError(result.error.message); return }
    onClose()
  }

  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog">
    <form className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" onSubmit={submit}>
      <h3 className="text-lg font-extrabold text-slate-950">{target.label}</h3>
      <label className="mt-4 block text-sm font-bold" htmlFor="correction-time">Thời gian (giờ Việt Nam)</label>
      <input className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3" id="correction-time" onChange={(e) => setOccurredAt(e.target.value)} required type="datetime-local" value={occurredAt} />
      {target.actionType === 'add_harvest' ? <><label className="mt-4 block text-sm font-bold" htmlFor="correction-bags">Số bao (có thể để trống)</label><input className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3" id="correction-bags" min="0" onChange={(e) => setBagQuantity(e.target.value)} step="1" type="number" value={bagQuantity} /></> : null}
      {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-3"><button className="min-h-12 rounded-xl border border-slate-300 font-bold" disabled={busy} onClick={onClose} type="button">Hủy</button><button className="min-h-12 rounded-xl bg-sky-700 font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? 'Đang lưu…' : 'Lưu chỉnh sửa'}</button></div>
    </form>
  </div>
}
