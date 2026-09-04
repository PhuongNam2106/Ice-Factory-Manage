'use client'

import { useState } from 'react'
import { lockProductionDay, reopenProductionDay } from '@/modules/production/actions'
import type { MachineProductionState, ProductionDayStatus } from '@/modules/production/types'
import { ProductionCorrectionDialog } from './production-correction-dialog'

export function ProductionDayControls({ productionDate, status, machines, writable }: { productionDate: string; status: ProductionDayStatus; machines: MachineProductionState[]; writable: boolean }) {
  const [target, setTarget] = useState<{ actionType: 'add_start' | 'add_harvest' | 'add_stop'; machineId: string; label: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  async function toggleDay() {
    setBusy(true); setMessage(null)
    const result = status === 'open' ? await lockProductionDay({ productionDate }) : await reopenProductionDay({ productionDate })
    setBusy(false); setMessage(result.ok ? (status === 'open' ? 'Đã khóa ngày sản xuất.' : 'Đã mở lại ngày sản xuất.') : result.error.message)
  }
  return <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-violet-700">Công cụ quản lý</p><h2 className="text-lg font-extrabold text-slate-950">Hiệu chỉnh và khóa ngày</h2></div><button className="min-h-12 rounded-xl bg-violet-700 px-5 font-bold text-white disabled:opacity-50" disabled={!writable || busy} onClick={toggleDay}>{busy ? 'Đang xử lý…' : status === 'open' ? 'Khóa ngày sản xuất' : 'Mở lại ngày'}</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{machines.map((machine) => <div className="rounded-2xl bg-white p-3" key={machine.id}><p className="font-bold">{machine.name}</p><div className="mt-2 flex flex-wrap gap-2">{([['add_start', 'Thêm bắt đầu'], ['add_harvest', 'Thêm xả đá'], ['add_stop', 'Thêm tắt máy']] as const).map(([actionType, label]) => <button className="min-h-10 rounded-xl border border-violet-200 px-3 text-xs font-bold text-violet-800 disabled:opacity-50" disabled={!writable || status === 'locked'} key={actionType} onClick={() => setTarget({ actionType, machineId: machine.id, label: `${label} · ${machine.name}` })}>{label}</button>)}</div></div>)}</div>
    {message ? <p className="mt-3 text-sm font-semibold text-violet-900">{message}</p> : null}
    {target ? <ProductionCorrectionDialog onClose={() => setTarget(null)} target={target} /> : null}
  </section>
}
