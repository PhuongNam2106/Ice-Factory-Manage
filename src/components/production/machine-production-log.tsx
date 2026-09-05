'use client'

import { useState } from 'react'
import { deleteProductionAction } from '@/modules/production/actions'
import type { DeleteProductionActionInput } from '@/modules/production/schema'
import type { MachineLogItem, MachineProductionState } from '@/modules/production/types'
import { HarvestQuantityForm } from './harvest-quantity-form'
import { ProductionCorrectionDialog } from './production-correction-dialog'
import { ProductionDeleteDialog } from './production-delete-dialog'

const labels = { start: 'Bắt đầu chạy', harvest: 'Xả đá', stop: 'Tắt máy' } as const
const actionNames = { start: 'bắt đầu chạy', harvest: 'xả đá', stop: 'tắt máy' } as const
const actionTextColors = { start: 'text-emerald-700', harvest: 'text-sky-700', stop: 'text-rose-700' } as const
const time = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
const dateTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

type CorrectionTarget = {
  actionType: 'change_run_start' | 'change_run_stop' | 'change_harvest_time'
  runId?: string
  harvestId?: string
  label: string
  initialTime: string
}

function deleteInput(machineId: string, item: MachineLogItem): DeleteProductionActionInput {
  const common = { machineId, actionType: item.type, idempotencyKey: crypto.randomUUID() }
  return item.type === 'harvest'
    ? { ...common, actionType: 'harvest', harvestId: item.harvestId! }
    : { ...common, actionType: item.type, runId: item.runId }
}

export function MachineProductionLog({ machine, isManager, locked, writable }: { machine: MachineProductionState; isManager: boolean; locked: boolean; writable: boolean }) {
  const [correction, setCorrection] = useState<CorrectionTarget | null>(null)
  const [deleting, setDeleting] = useState<MachineLogItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function executeDelete() {
    if (!deleting) return
    setBusy(true)
    setMessage(null)
    const result = await deleteProductionAction(deleteInput(machine.id, deleting))
    setBusy(false)
    if (result.ok) {
      setMessage(`Đã xóa thời điểm ${actionNames[deleting.type]}.`)
      setDeleting(null)
      return
    }
    setMessage(result.error.message)
  }

  return <section aria-label={`Nhật ký ${machine.name}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{machine.code}</p><h2 className="text-xl font-extrabold text-slate-950">Nhật ký {machine.name}</h2></div>
      <p className="text-sm font-extrabold text-sky-800">{machine.totalBags} bao / {machine.harvestCount} lần xả</p>
    </header>
    {locked ? <p className="m-4 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ngày sản xuất đã khóa. Nhật ký chỉ có thể xem.</p> : null}
    {isManager && !locked && machine.logs.length > 1 ? <p className="mx-4 mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Để giữ đúng trình tự máy, hãy xóa lần lượt từ hành động mới nhất.</p> : null}
    {message ? <p aria-live="polite" className="mx-4 mt-4 rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-900">{message}</p> : null}
    <ol className="space-y-3 p-4">
      {machine.logs.map((item, index) => {
        const isLatest = index === 0
        const canDelete = writable && !locked && isLatest
        const deleteReason = locked ? 'Ngày sản xuất đã khóa.' : !writable ? 'Chưa có kết nối đồng bộ an toàn.' : !isLatest ? 'Phải xóa hành động mới nhất trước.' : undefined
        return <li className={`rounded-2xl border p-4 text-sm [content-visibility:auto] [contain-intrinsic-size:0_148px] ${item.type === 'harvest' && item.bagQuantity === 0 ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`} key={item.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p className={`font-extrabold ${actionTextColors[item.type]}`}>{labels[item.type]}{item.type === 'harvest' ? item.bagQuantity === null || item.bagQuantity === undefined ? ' · Chờ số bao' : ` · ${item.bagQuantity} bao` : ''}</p><p className="mt-1 text-slate-500">{dateTime.format(new Date(item.occurredAt))} · {item.actorName}</p>{item.quantityUpdatedAt ? <p className="mt-1 text-xs text-slate-500">Số bao cập nhật {dateTime.format(new Date(item.quantityUpdatedAt))} bởi {item.quantityUpdatedBy}</p> : null}</div>
            {isManager && !locked ? <div className="flex flex-wrap gap-2">
              <button className="min-h-10 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50" disabled={!writable} onClick={() => setCorrection({ actionType: item.type === 'start' ? 'change_run_start' : item.type === 'stop' ? 'change_run_stop' : 'change_harvest_time', runId: item.runId, harvestId: item.harvestId, initialTime: item.occurredAt, label: `Sửa giờ ${labels[item.type].toLowerCase()} · ${machine.name}` })}>Sửa thời gian</button>
              <button aria-label={`Xóa ${actionNames[item.type]} lúc ${time.format(new Date(item.occurredAt))}`} className="min-h-10 rounded-xl border border-rose-300 px-3 text-xs font-bold text-rose-700 disabled:border-slate-200 disabled:text-slate-400" disabled={!canDelete} onClick={() => setDeleting(item)} title={deleteReason}>Xóa</button>
            </div> : null}
          </div>
          {item.type === 'harvest' && item.harvestId && item.bagQuantity !== null && item.bagQuantity !== undefined ? <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-sky-700">Sửa số bao</summary><HarvestQuantityForm disabled={!writable || locked} harvestId={item.harvestId} initialQuantity={item.bagQuantity} label={`Sửa số bao lần xả lúc ${dateTime.format(new Date(item.occurredAt))}`} /></details> : null}
        </li>
      })}
      {!machine.logs.length ? <li className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Chưa có hoạt động trong ngày này.</li> : null}
    </ol>
    {deleting ? <ProductionDeleteDialog busy={busy} item={deleting} machineName={machine.name} onCancel={() => setDeleting(null)} onConfirm={executeDelete} /> : null}
    {correction ? <ProductionCorrectionDialog onClose={() => setCorrection(null)} target={correction} /> : null}
  </section>
}
