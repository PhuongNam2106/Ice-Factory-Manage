'use client'

import { useState, useTransition } from 'react'
import { approveExpense, getExpenseAttachmentUrl, rejectExpense } from '@/modules/expenses/actions'
import type { ExpenseItem } from '@/modules/expenses/types'

const currency = new Intl.NumberFormat('vi-VN')

export function AttachmentButton({ attachmentId, label }: { attachmentId: string; label: string }) {
  const [pending, startTransition] = useTransition()
  function open() {
    startTransition(async () => {
      const result = await getExpenseAttachmentUrl(attachmentId)
      if (result.ok) window.location.assign(result.data.signedUrl)
    })
  }
  return <button className="text-sm font-bold text-sky-700 underline" disabled={pending} onClick={open} type="button">{pending ? 'Đang mở…' : label}</button>
}

export function ExpenseReviewCard({ expense }: { expense: ExpenseItem }) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function review(decision: 'approved' | 'rejected') {
    setMessage(null)
    startTransition(async () => {
      const result = decision === 'approved'
        ? await approveExpense(expense.id)
        : await rejectExpense(expense.id, reason)
      setMessage(result.ok ? 'Đã xử lý khoản chi.' : result.error.message)
    })
  }

  return <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-sm font-bold text-slate-950">{expense.categoryName} · {expense.payee}</p><p className="text-xs text-slate-500">Ngày {expense.operatingDay}</p></div>
      <p className="text-xl font-extrabold text-slate-950">{currency.format(expense.amountVnd)} đ</p>
    </div>
    {expense.note ? <p className="text-sm text-slate-600">{expense.note}</p> : null}
    {expense.attachments.map((attachment) => <AttachmentButton attachmentId={attachment.id} key={attachment.id} label={`Mở ${attachment.originalName}`} />)}
    <textarea className="min-h-20 w-full rounded-2xl border border-slate-300 p-3 text-sm" maxLength={1000} onChange={(event) => setReason(event.target.value)} placeholder="Lý do từ chối (bắt buộc khi từ chối)" value={reason} />
    {message ? <p aria-live="polite" className="text-sm font-semibold text-slate-700">{message}</p> : null}
    <div className="grid grid-cols-2 gap-3">
      <button className="min-h-12 rounded-2xl bg-emerald-600 px-4 font-bold text-white" disabled={pending} onClick={() => review('approved')} type="button">Duyệt</button>
      <button className="min-h-12 rounded-2xl bg-rose-600 px-4 font-bold text-white" disabled={pending} onClick={() => review('rejected')} type="button">Từ chối</button>
    </div>
  </article>
}
