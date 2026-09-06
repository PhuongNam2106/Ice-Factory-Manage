import Link from 'next/link'
import { AttachmentButton } from '@/components/expenses/expense-review-card'
import { CancelDocumentDialog } from '@/components/forms/cancel-document-dialog'
import { CorrectOccurredAtDialog } from '@/components/forms/correct-occurred-at-dialog'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { listExpenses } from '@/modules/expenses/repository'

const currency = new Intl.NumberFormat('vi-VN')
const labels = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}

export default async function ExpensesPage() {
  const user = await requireUser()
  const client = await createServerSupabaseClient()
  const expenses = await listExpenses(client)

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Vận hành</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-950 sm:text-3xl">Chi Phí</h1>
          <p className="mt-1 text-sm text-slate-600">Chỉ khoản đã duyệt mới được tính vào lợi nhuận chính thức.</p>
        </div>
        <div className="flex gap-3">
          {user.role === 'manager' ? <Link className="min-h-12 rounded-2xl border border-sky-300 px-4 py-3 text-sm font-bold text-sky-800" href="/expenses/review">Duyệt chi phí</Link> : null}
          <Link className="min-h-12 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-bold text-white" href="/expenses/new">+ Nhập chi phí</Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {expenses.map((expense) => {
            const canEdit = expense.status !== 'cancelled'
              && (user.role === 'manager' || expense.createdBy === user.id)

            return (
              <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:p-5" key={expense.id}>
                <div>
                  <p className="font-bold text-slate-950">{expense.categoryName} · {expense.payee}</p>
                  <p className="text-sm text-slate-500">{expense.operatingDay} · {labels[expense.status]}</p>
                  {expense.reviewReason ? <p className="mt-1 text-sm text-rose-700">Lý do: {expense.reviewReason}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {expense.attachments.map((attachment) => (
                      <AttachmentButton attachmentId={attachment.id} key={attachment.id} label={attachment.originalName} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <p className="font-extrabold text-slate-950">{currency.format(expense.amountVnd)} đ</p>
                  {canEdit ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <CorrectOccurredAtDialog entityId={expense.id} entityType="expense" label="khoản chi" occurredAt={expense.occurredAt} version={expense.version} />
                      <CancelDocumentDialog entityId={expense.id} entityType="expense" label="khoản chi" version={expense.version} />
                    </div>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
        {expenses.length === 0 ? <p className="p-6 text-sm text-slate-500">Chưa có khoản chi.</p> : null}
      </div>
    </section>
  )
}
