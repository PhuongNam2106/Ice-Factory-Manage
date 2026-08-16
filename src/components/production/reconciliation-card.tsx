'use client'

import { useRef, useState, useTransition } from 'react'
import { selectOfficialProductionSource } from '@/modules/production/actions'
import type { ProductionReconciliationSummary } from '@/modules/production/types'
import { createIdempotencyKey } from '@/modules/shared/idempotency'

const shifts = { ca_sang: 'Ca sáng', ca_chieu: 'Ca chiều', ca_dem: 'Ca đêm' }

export function ReconciliationCard({ item, isManager }: { item: ProductionReconciliationSummary; isManager: boolean }) {
  const key = useRef(createIdempotencyKey())
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const needsConfirmation = !item.isConfirmed

  function confirm(source: 'batches' | 'shift_total') {
    startTransition(async () => {
      const result = await selectOfficialProductionSource({
        operatingDay: item.operatingDay, shiftCode: item.shiftCode, machineId: item.machineId,
        selectedSource: source, idempotencyKey: key.current,
      })
      if (!result.ok) return setMessage(result.error.message)
      key.current = createIdempotencyKey()
      setMessage('Đã xác nhận nguồn sản lượng chính thức.')
    })
  }

  return (
    <article className={`rounded-3xl border bg-white p-5 shadow-sm ${needsConfirmation ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold text-slate-950">{item.machineName}</h2><p className="text-xs font-semibold text-slate-500">{shifts[item.shiftCode]}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${needsConfirmation ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>{needsConfirmation ? 'Cần đối soát' : 'Đã ghi tồn kho'}</span></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-sky-50 p-3"><dt className="text-xs text-slate-600">Tổng từng mẻ</dt><dd className="text-xl font-extrabold text-sky-900">{item.batchGoodBags} bao</dd></div><div className="rounded-2xl bg-indigo-50 p-3"><dt className="text-xs text-slate-600">Tổng cuối ca</dt><dd className="text-xl font-extrabold text-indigo-900">{item.shiftGoodBags === null ? '—' : `${item.shiftGoodBags} bao`}</dd></div></dl>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm"><p>Chênh lệch: <strong className={item.hasDiscrepancy ? 'text-amber-800' : 'text-emerald-700'}>{Number(item.diffBags) > 0 ? '+' : ''}{item.diffBags} bao {item.pct === null ? '(không có mẫu số)' : `(${item.pct}%)`}</strong></p><p className="mt-1">Đang tính tồn kho: <strong>{item.selectedSource === 'batches' ? 'Từng mẻ' : 'Tổng cuối ca'} · {item.officialQuantityBags} bao</strong></p></div>
      {needsConfirmation && isManager ? <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><button className="min-h-11 rounded-xl border border-sky-300 font-bold text-sky-800 disabled:opacity-50" disabled={pending} onClick={() => confirm('batches')}>Chọn từng mẻ</button>{item.shiftGoodBags === null ? null : <button className="min-h-11 rounded-xl bg-sky-700 font-bold text-white disabled:opacity-50" disabled={pending} onClick={() => confirm('shift_total')}>Chọn tổng ca</button>}</div> : null}
      {needsConfirmation && !isManager ? <p className="mt-4 text-sm font-semibold text-amber-800">Đang chờ quản lý xác nhận nguồn chính thức.</p> : null}
      {message ? <p aria-live="polite" className="mt-3 text-sm font-semibold text-slate-700">{message}</p> : null}
    </article>
  )
}
