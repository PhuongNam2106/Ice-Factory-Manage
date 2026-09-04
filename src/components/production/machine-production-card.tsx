'use client'

import { useState } from 'react'
import { recordHarvest, startMachine, stopMachine } from '@/modules/production/actions'
import { canStartMachine } from '@/modules/production/production-day'
import { getRunOvertimeLevel, isHarvestReminderDue } from '@/modules/production/presentation'
import type { MachineProductionState } from '@/modules/production/types'
import { HarvestQuantityForm } from './harvest-quantity-form'
import { ProductionConfirmDialog } from './production-confirm-dialog'
import { ProductionCorrectionDialog } from './production-correction-dialog'

const labels = { start: 'Bắt đầu chạy', harvest: 'Xả đá', stop: 'Tắt máy' } as const
const time = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })

export function MachineProductionCard({ machine, now, writable, managerWritable, locked, reminderMinutes, productionEndsAt, isManager }: { machine: MachineProductionState; now: Date; writable: boolean; managerWritable: boolean; locked: boolean; reminderMinutes: number; productionEndsAt: string; isManager: boolean }) {
  const [confirm, setConfirm] = useState<keyof typeof labels | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [correction, setCorrection] = useState<{ actionType: 'change_run_start' | 'change_run_stop' | 'change_harvest_time'; runId?: string; harvestId?: string; label: string; initialTime: string } | null>(null)
  const running = Boolean(machine.openRun)
  const hasPending = Boolean(machine.pendingHarvest)
  const startWindow = canStartMachine(now)
  const commonReason = locked ? 'Ngày sản xuất đã khóa.' : !writable ? 'Chưa có kết nối đồng bộ an toàn.' : null
  const reasons = {
    start: commonReason ?? (running ? 'Máy đang chạy; hãy tắt máy trước khi bắt đầu phiên mới.' : !startWindow ? 'Không thể bắt đầu máy trong khoảng 18:00–20:00.' : null),
    harvest: commonReason ?? (!running ? 'Phải bắt đầu máy trước khi xả đá.' : hasPending ? 'Lần xả gần nhất chưa có số bao; hãy cập nhật trước khi xả tiếp.' : null),
    stop: commonReason ?? (!running ? 'Máy hiện đang dừng.' : null),
  }
  const pendingDue = machine.pendingHarvest ? isHarvestReminderDue(new Date(machine.pendingHarvest.harvestedAt), now, reminderMinutes) : false
  const overtime = machine.openRun ? getRunOvertimeLevel(now, new Date(productionEndsAt)) : 'none'
  const quantityWritable = isManager ? managerWritable : writable

  async function execute() {
    if (!confirm) return
    setBusy(true); setMessage(null)
    const input = { machineId: machine.id, idempotencyKey: crypto.randomUUID() }
    const result = confirm === 'start' ? await startMachine(input) : confirm === 'harvest' ? await recordHarvest(input) : await stopMachine(input)
    setBusy(false); setConfirm(null)
    setMessage(result.ok ? `Đã ghi nhận ${labels[confirm].toLowerCase()}.` : result.error.message)
  }

  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
      <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{machine.code}</p><h2 className="text-xl font-extrabold text-slate-950">{machine.name}</h2></div>
      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${running ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{running ? '● Đang chạy' : '■ Đang dừng'}</span>
    </header>
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {(['start', 'harvest', 'stop'] as const).map((action) => <button className={`min-h-14 rounded-2xl px-2 text-sm font-extrabold text-white disabled:bg-slate-200 disabled:text-slate-500 ${action === 'start' ? 'bg-emerald-600' : action === 'harvest' ? 'bg-sky-700' : 'bg-rose-600'}`} disabled={Boolean(reasons[action]) || busy} key={action} onClick={() => setConfirm(action)} title={reasons[action] ?? undefined}>{labels[action]}</button>)}
      </div>
      {Object.entries(reasons).some(([, reason]) => reason) ? <ul className="mt-3 space-y-1 text-xs text-slate-600">{Object.entries(reasons).filter(([, reason]) => reason).map(([action, reason]) => <li key={action}><strong>{labels[action as keyof typeof labels]}:</strong> {reason}</li>)}</ul> : null}
      {overtime !== 'none' ? <p className={`mt-3 rounded-xl p-3 text-sm font-bold ${overtime === 'critical' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>Máy vẫn đang chạy quá giờ kết thúc ngày sản xuất. Dữ liệu tiếp tục thuộc ngày đã bắt đầu máy.</p> : null}
      {machine.pendingHarvest ? <>
        {pendingDue ? <p className="mt-3 text-sm font-bold text-amber-700">Đã hơn {reminderMinutes} phút từ lúc xả — vui lòng tổng kết số bao.</p> : <p className="mt-3 text-sm text-slate-600">Đang chờ tổng kết số bao cho lần xả lúc {time.format(new Date(machine.pendingHarvest.harvestedAt))}.</p>}
        <HarvestQuantityForm disabled={!quantityWritable || locked} harvestId={machine.pendingHarvest.id} />
      </> : null}
      {message ? <p aria-live="polite" className="mt-3 rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-900">{message}</p> : null}
    </div>
    <section className="border-t border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between"><h3 className="font-extrabold text-slate-900">Nhật ký máy</h3><span className="text-sm font-bold text-sky-800">{machine.totalBags} bao / {machine.harvestCount} lần xả</span></div>
      <ol className="mt-3 max-h-72 space-y-2 overflow-auto">
        {machine.logs.map((item) => <li className={`rounded-xl border p-3 text-sm ${item.type === 'harvest' && item.bagQuantity === 0 ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`} key={item.id}>
          <p className="font-bold text-slate-900">{labels[item.type]}{item.type === 'harvest' ? item.bagQuantity === null || item.bagQuantity === undefined ? ' · Chờ số bao' : ` · ${item.bagQuantity} bao` : ''}</p>
          <p className="text-slate-500">{time.format(new Date(item.occurredAt))} · {item.actorName}</p>
          {item.quantityUpdatedAt ? <p className="mt-1 text-xs text-slate-500">Số bao cập nhật {time.format(new Date(item.quantityUpdatedAt))} bởi {item.quantityUpdatedBy}</p> : null}
          {item.type === 'harvest' && item.harvestId && item.bagQuantity !== null && item.bagQuantity !== undefined ? <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-sky-700">Sửa số bao</summary><HarvestQuantityForm disabled={!quantityWritable || locked} harvestId={item.harvestId} initialQuantity={item.bagQuantity} label={`Sửa số bao lần xả lúc ${time.format(new Date(item.occurredAt))}`} /></details> : null}
          {isManager && !locked ? <button className="mt-2 min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50" disabled={!managerWritable} onClick={() => setCorrection({ actionType: item.type === 'start' ? 'change_run_start' : item.type === 'stop' ? 'change_run_stop' : 'change_harvest_time', runId: item.runId, harvestId: item.harvestId, initialTime: item.occurredAt, label: `Sửa giờ ${labels[item.type].toLowerCase()} · ${machine.name}` })}>Sửa thời gian</button> : null}
        </li>)}
        {!machine.logs.length ? <li className="text-sm text-slate-500">Chưa có hoạt động trong ngày này.</li> : null}
      </ol>
    </section>
    {confirm ? <ProductionConfirmDialog action={labels[confirm]} busy={busy} machineName={machine.name} onCancel={() => setConfirm(null)} onConfirm={execute} /> : null}
    {correction ? <ProductionCorrectionDialog onClose={() => setCorrection(null)} target={correction} /> : null}
  </article>
}
