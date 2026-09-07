'use client'

import { useState, useTransition } from 'react'
import {
  approveExpense,
  getExpenseAttachmentUrl,
  rejectExpense,
} from '@/modules/expenses/actions'
import type { ExpenseItem } from '@/modules/expenses/types'
import {
  Check,
  CircleNotch,
  FileArrowUp,
  X,
} from '@phosphor-icons/react'

const currency = new Intl.NumberFormat('vi-VN')

export function AttachmentButton({
  attachmentId,
  label,
}: {
  attachmentId: string
  label: string
}) {
  const [pending, startTransition] = useTransition()

  function open() {
    startTransition(async () => {
      const result = await getExpenseAttachmentUrl(attachmentId)
      if (result.ok) window.location.assign(result.data.signedUrl)
    })
  }

  return (
    <button
      className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline disabled:opacity-50"
      disabled={pending}
      onClick={open}
      type="button"
    >
      <FileArrowUp className="h-3.5 w-3.5" weight="bold" />
      <span>{pending ? 'Đang mở…' : label}</span>
    </button>
  )
}

export function ExpenseReviewCard({ expense }: { expense: ExpenseItem }) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function review(decision: 'approved' | 'rejected') {
    setMessage(null)
    startTransition(async () => {
      const result =
        decision === 'approved'
          ? await approveExpense(expense.id)
          : await rejectExpense(expense.id, reason)
      setMessage(result.ok ? 'Đã xử lý khoản chi.' : result.error.message)
    })
  }

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs sm:rounded-3xl sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-950">
            {expense.categoryName} · {expense.payee}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Ngày vận hành: {expense.operatingDay}
          </p>
        </div>
        <p className="text-xl font-black tabular-nums tracking-tight text-slate-950">
          {currency.format(expense.amountVnd)} đ
        </p>
      </div>

      {expense.note ? (
        <p className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
          {expense.note}
        </p>
      ) : null}

      {expense.attachments.length ? (
        <div className="flex flex-wrap gap-3">
          {expense.attachments.map((attachment) => (
            <AttachmentButton
              attachmentId={attachment.id}
              key={attachment.id}
              label={`Mở ${attachment.originalName}`}
            />
          ))}
        </div>
      ) : null}

      <textarea
        className="min-h-20 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        maxLength={1000}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Lý do từ chối (bắt buộc khi bấm Từ chối)…"
        value={reason}
      />

      {message ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-bold text-sky-900"
        >
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          disabled={pending}
          onClick={() => review('approved')}
          type="button"
        >
          {pending ? (
            <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
          ) : (
            <Check className="h-4 w-4" weight="bold" />
          )}
          <span>Duyệt</span>
        </button>

        <button
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-rose-700 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          disabled={pending}
          onClick={() => review('rejected')}
          type="button"
        >
          {pending ? (
            <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
          ) : (
            <X className="h-4 w-4" weight="bold" />
          )}
          <span>Từ chối</span>
        </button>
      </div>
    </article>
  )
}
