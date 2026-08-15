'use client'

import { useRef, useState, useTransition } from 'react'
import { recordStockCount } from '@/modules/inventory/actions'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { button, control, Field, Message } from './production-batch-form'

export function StockCountForm({
  operatingDay,
  expectedBags,
}: {
  operatingDay: string
  expectedBags: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const idempotencyKey = useRef(createIdempotencyKey())
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await recordStockCount({
        operatingDay,
        actualBags: String(formData.get('actualBags') ?? ''),
        note: String(formData.get('note') ?? ''),
        idempotencyKey: idempotencyKey.current,
      })
      if (!result.ok) return setMessage(result.error.message)

      const variance = Number(result.data.varianceBags)
      setMessage(
        variance === 0
          ? 'Đã lưu kiểm kho. Số thực tế khớp số hệ thống.'
          : `Đã lưu và điều chỉnh ${variance > 0 ? '+' : ''}${result.data.varianceBags} bao.`,
      )
      idempotencyKey.current = createIdempotencyKey()
      formRef.current?.reset()
    })
  }

  return (
    <form
      action={submit}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      ref={formRef}
    >
      <div className="rounded-2xl bg-sky-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Tồn hệ thống trước kiểm</p>
        <p className="mt-1 text-3xl font-extrabold text-slate-950">{expectedBags} bao</p>
      </div>
      <Field label="Số bao đếm thực tế">
        <input
          autoFocus
          className={control}
          inputMode="numeric"
          min="0"
          name="actualBags"
          required
          step="1"
          type="number"
        />
      </Field>
      <Field label="Ghi chú kiểm kho">
        <textarea className={`${control} min-h-24`} maxLength={1000} name="note" />
      </Field>
      <Message message={message} />
      <button className={button} disabled={pending} type="submit">
        {pending ? 'Đang đối chiếu…' : 'Lưu kết quả kiểm kho'}
      </button>
    </form>
  )
}
