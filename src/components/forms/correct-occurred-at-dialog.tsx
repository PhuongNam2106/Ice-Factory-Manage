'use client'

import { useState, useTransition } from 'react'
import { correctDocumentOccurredAt } from '@/modules/shared/document-time-actions'
import type { CorrectOccurredAtInput } from '@/modules/shared/document-time'

const bangkokInput = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function toBangkokInput(value: string) {
  return bangkokInput.format(new Date(value)).replace(' ', 'T')
}

export function CorrectOccurredAtDialog({
  entityType,
  entityId,
  version,
  occurredAt,
  label,
}: {
  entityType: CorrectOccurredAtInput['entityType']
  entityId: string
  version: number
  occurredAt: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(() => toBangkokInput(occurredAt))
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const titleId = `correct-time-title-${entityId}`

  function submit() {
    setMessage(null)
    startTransition(async () => {
      const result = await correctDocumentOccurredAt({
        entityType,
        entityId,
        expectedVersion: version,
        occurredAt: `${value}:00+07:00`,
        idempotencyKey: crypto.randomUUID(),
      })
      if (result.ok) {
        setMessage('Đã cập nhật thời gian và ngày vận hành.')
        setOpen(false)
      } else {
        setMessage(result.error.message)
      }
    })
  }

  return (
    <div className="text-left">
      {open ? (
        <div aria-labelledby={titleId} aria-modal="true" className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4" role="dialog">
          <h3 className="font-extrabold text-sky-950" id={titleId}>Sửa thời gian {label}</h3>
          <p className="text-xs text-sky-800">Ngày vận hành sẽ được hệ thống tính lại theo mốc 20:00.</p>
          <label className="block text-xs font-bold text-sky-950" htmlFor={`${entityId}-occurred-at`}>
            Thời gian thực tế
          </label>
          <input
            className="min-h-12 w-full rounded-xl border border-sky-300 bg-white px-3 text-sm"
            id={`${entityId}-occurred-at`}
            onChange={(event) => setValue(event.target.value)}
            required
            type="datetime-local"
            value={value}
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold" disabled={pending} onClick={() => setOpen(false)} type="button">Hủy</button>
            <button className="min-h-11 rounded-xl bg-sky-700 px-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending || !value} onClick={submit} type="button">{pending ? 'Đang lưu…' : 'Lưu thời gian'}</button>
          </div>
        </div>
      ) : (
        <button className="min-h-11 rounded-xl border border-sky-200 px-3 text-sm font-bold text-sky-700 hover:bg-sky-50" onClick={() => setOpen(true)} type="button">Sửa thời gian</button>
      )}
      {message ? <p aria-live="polite" className="mt-2 max-w-sm text-xs font-semibold text-slate-700">{message}</p> : null}
    </div>
  )
}
