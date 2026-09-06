'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveDailyLossAction } from '@/modules/loss/actions'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import type { DailyLossReport } from '@/modules/loss/types'
import { button, control, Field } from './form-primitives'

function successMessage(report: DailyLossReport) {
  const rate = report.differencePct == null
    ? null
    : Number(report.differencePct).toLocaleString('vi-VN', { maximumFractionDigits: 3 })
  if (report.classification === 'loss') return `Đã lưu. Hao hụt ${report.differenceBags ?? 0} bao, tương đương ${rate}%.`
  if (report.classification === 'surplus') return `Đã lưu. Dư kho ${Math.abs(report.differenceBags ?? 0)} bao, tương đương ${rate}%.`
  if (report.classification === 'matched') return 'Đã lưu. Số liệu khớp kho.'
  return 'Đã lưu chênh lệch; không thể tính tỷ lệ vì chưa có sản lượng.'
}

export function DailyLossForm({ report }: { report: DailyLossReport }) {
  const router = useRouter()
  const idempotencyKey = useRef(createIdempotencyKey())
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const needsOpening = report.openingBags == null && report.previousDayReady
  const missingPreviousDay = report.openingBags == null && !report.previousDayReady
  const locked = report.status === 'locked'
  const blocked = missingPreviousDay || report.pendingHarvestCount > 0
  const disabled = pending || locked || blocked

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await saveDailyLossAction({
        operatingDay: report.operatingDay,
        openingBags: needsOpening ? String(formData.get('openingBags') ?? '') : undefined,
        closingBags: String(formData.get('closingBags') ?? ''),
        note: String(formData.get('note') ?? ''),
        expectedVersion: report.version,
        idempotencyKey: idempotencyKey.current,
      })
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.error.message })
        if (result.error.code === 'VERSION_CONFLICT' || result.error.code === 'LOSS_REPORT_STALE') router.refresh()
        return
      }

      setMessage({ tone: 'success', text: successMessage(result.data) })
      idempotencyKey.current = createIdempotencyKey()
      router.refresh()
    })
  }

  const buttonLabel = pending
    ? 'Đang lưu…'
    : locked
      ? 'Ngày đã khóa'
      : blocked
        ? 'Chưa thể lưu đối soát'
        : report.id
          ? 'Cập nhật đối soát'
          : 'Lưu đối soát'

  return (
    <form action={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Chốt tồn thực tế</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-950">Nhập số bao lúc 20:00</h2>
        <p className="mt-1 text-sm text-slate-600">Có thể nhập nhanh ở giờ hiện tại; hệ thống vẫn ghi nhận cho ngày vận hành đang chọn.</p>
      </div>

      {needsOpening ? (
        <Field label="Tồn đầu ngày">
          <input className={control} defaultValue="" disabled={locked} inputMode="numeric" min="0" name="openingBags" required step="1" type="number" />
        </Field>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tồn đầu kế thừa</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{report.openingBags == null ? 'Chưa xác định' : `${report.openingBags.toLocaleString('vi-VN')} bao`}</p>
        </div>
      )}

      <Field label="Tồn cuối thực tế">
        <input autoFocus className={control} defaultValue={report.closingBags ?? ''} disabled={locked} inputMode="numeric" min="0" name="closingBags" required step="1" type="number" />
      </Field>
      <Field label="Ghi chú (không bắt buộc)">
        <textarea className={`${control} min-h-24 py-3`} defaultValue={report.note ?? ''} disabled={locked} maxLength={1000} name="note" />
      </Field>

      {locked ? <p className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">Ngày vận hành đã khóa nên không thể chỉnh sửa.</p> : null}
      {missingPreviousDay ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Ngày trước chưa được chốt nên chưa xác định được tồn đầu. Hãy hoàn tất ngày trước trước.</p> : null}
      {report.pendingHarvestCount > 0 ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Còn {report.pendingHarvestCount} lần xả đá chưa nhập số bao.</p> : null}
      {message ? <p aria-live="polite" className={`rounded-2xl p-4 text-sm font-semibold ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>{message.text}</p> : null}

      <button className={button} disabled={disabled} type="submit">{buttonLabel}</button>
    </form>
  )
}
