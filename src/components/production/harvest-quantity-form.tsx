'use client'

import { useState } from 'react'
import { setHarvestQuantity } from '@/modules/production/actions'

export function HarvestQuantityForm({ harvestId, disabled, initialQuantity, onDone, label = 'Số bao của lần xả gần nhất' }: { harvestId: string; disabled: boolean; initialQuantity?: number | null; onDone?: () => void; label?: string }) {
  const [quantity, setQuantity] = useState(initialQuantity?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null)
    const result = await setHarvestQuantity({ harvestId, quantity, idempotencyKey: crypto.randomUUID() })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage('Đã cập nhật số bao.'); onDone?.()
  }

  return <form className="mt-3 rounded-2xl bg-amber-50 p-3" onSubmit={submit}>
    <label className="text-sm font-bold text-amber-950" htmlFor={`bags-${harvestId}`}>{label}</label>
    <div className="mt-2 flex gap-2">
      <input className="min-h-12 min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 text-lg font-bold outline-none focus:ring-2 focus:ring-sky-500" disabled={disabled || busy} id={`bags-${harvestId}`} inputMode="numeric" min="0" onChange={(e) => setQuantity(e.target.value)} placeholder="0" required step="1" type="number" value={quantity} />
      <button className="min-h-12 rounded-xl bg-amber-600 px-4 font-bold text-white disabled:opacity-50" disabled={disabled || busy} type="submit">{busy ? 'Đang lưu…' : 'Cập nhật'}</button>
    </div>
    {message ? <p aria-live="polite" className="mt-2 text-sm font-semibold text-amber-900">{message}</p> : null}
  </form>
}
