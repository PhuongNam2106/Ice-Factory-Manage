'use client'

import { useState } from 'react'
import { addHistoricalMachineRun } from '@/modules/production/actions'

export function HistoricalMachineRunDialog({
  machineId,
  machineName,
  productionDate,
  onClose,
}: {
  machineId: string
  machineName: string
  productionDate: string
  onClose: () => void
}) {
  const [startedAt, setStartedAt] = useState(`${productionDate}T20:00`)
  const [stoppedAt, setStoppedAt] = useState(`${productionDate}T21:00`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await addHistoricalMachineRun({
      machineId,
      productionDate,
      startedAt: `${startedAt}:00+07:00`,
      stoppedAt: `${stoppedAt}:00+07:00`,
      idempotencyKey: crypto.randomUUID(),
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    onClose()
  }

  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog">
    <form className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" onSubmit={submit}>
      <h3 className="text-lg font-extrabold text-slate-950">Thêm phiên chạy cũ · {machineName} · Ngày {productionDate}</h3>
      <p className="mt-2 text-sm text-slate-600">Nhập đủ hai mốc thời gian theo sổ tay. Sau khi lưu, bạn có thể thêm các lần xả đá vào phiên này.</p>

      <label className="mt-4 block text-sm font-bold" htmlFor="historical-run-start">Giờ bắt đầu (giờ Việt Nam)</label>
      <input className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3" id="historical-run-start" onChange={(event) => setStartedAt(event.target.value)} required type="datetime-local" value={startedAt} />

      <label className="mt-4 block text-sm font-bold" htmlFor="historical-run-stop">Giờ tắt máy (giờ Việt Nam)</label>
      <input className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3" id="historical-run-stop" onChange={(event) => setStoppedAt(event.target.value)} required type="datetime-local" value={stoppedAt} />

      {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="min-h-12 rounded-xl border border-slate-300 font-bold" disabled={busy} onClick={onClose} type="button">Hủy</button>
        <button className="min-h-12 rounded-xl bg-sky-700 font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? 'Đang lưu…' : 'Lưu phiên chạy'}</button>
      </div>
    </form>
  </div>
}
