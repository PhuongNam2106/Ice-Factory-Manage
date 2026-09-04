'use client'

import { useRef, useState, useTransition } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import {
  createExpense,
  createExpenseAttachmentUpload,
  finalizeExpenseAttachment,
} from '@/modules/expenses/actions'
import type { ExpenseCategoryItem } from '@/modules/expenses/types'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { button, control, Field } from './form-primitives'

export function ExpenseForm({
  categories,
  operatingDay,
}: {
  categories: ExpenseCategoryItem[]
  operatingDay: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const idempotencyKey = useRef(createIdempotencyKey())
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await createExpense({
        operatingDay,
        categoryId: String(formData.get('categoryId') ?? ''),
        amountVnd: String(formData.get('amountVnd') ?? ''),
        payee: String(formData.get('payee') ?? ''),
        note: String(formData.get('note') ?? ''),
        idempotencyKey: idempotencyKey.current,
      })
      if (!result.ok) return setMessage(result.error.message)

      const file = formData.get('attachment')
      if (file instanceof File && file.size > 0) {
        const contentType = (['image/jpeg', 'image/png', 'application/pdf'] as const).find(
          (allowed) => allowed === file.type,
        )
        if (!contentType) {
          return setMessage('Chứng từ phải là tệp JPEG, PNG hoặc PDF.')
        }
        const metadata = {
          expenseId: result.data.expenseId,
          fileName: file.name,
          contentType,
          sizeBytes: file.size,
        }
        const upload = await createExpenseAttachmentUpload(metadata)
        if (!upload.ok) {
          return setMessage(`Đã lưu khoản chi nhưng chưa tải được chứng từ: ${upload.error.message}`)
        }
        const browser = createBrowserSupabaseClient()
        const uploaded = await browser.storage
          .from('expense-receipts')
          .uploadToSignedUrl(upload.data.objectPath, upload.data.token, file, {
            contentType,
          })
        if (uploaded.error) {
          return setMessage('Đã lưu khoản chi nhưng tải chứng từ thất bại. Bạn có thể thử lại.')
        }
        const finalized = await finalizeExpenseAttachment({ ...metadata, objectPath: upload.data.objectPath })
        if (!finalized.ok) {
          return setMessage(`Đã tải tệp nhưng chưa xác nhận được chứng từ: ${finalized.error.message}`)
        }
      }

      setMessage('Đã lưu khoản chi ở trạng thái Chờ duyệt.')
      idempotencyKey.current = createIdempotencyKey()
      formRef.current?.reset()
    })
  }

  return (
    <form action={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" ref={formRef}>
      <Field label="Loại chi phí">
        <select className={control} name="categoryId" required>
          <option value="">Chọn loại chi phí</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Số tiền (VNĐ)">
          <input className={control} inputMode="numeric" min="1" name="amountVnd" required step="1" type="number" />
        </Field>
        <Field label="Người nhận">
          <input className={control} maxLength={200} name="payee" required />
        </Field>
      </div>
      <Field label="Ghi chú">
        <textarea className={`${control} min-h-24`} maxLength={1000} name="note" />
      </Field>
      <Field label="Ảnh/PDF chứng từ (tùy chọn, tối đa 10 MB)">
        <input accept="image/jpeg,image/png,application/pdf" className={control} name="attachment" type="file" />
      </Field>
      {message ? <p aria-live="polite" className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-900">{message}</p> : null}
      <button className={button} disabled={pending} type="submit">
        {pending ? 'Đang lưu…' : 'Lưu khoản chi'}
      </button>
    </form>
  )
}
