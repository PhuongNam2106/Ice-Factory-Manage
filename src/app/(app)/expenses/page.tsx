import Link from 'next/link'
import { AttachmentButton } from '@/components/expenses/expense-review-card'
import { CancelDocumentDialog } from '@/components/forms/cancel-document-dialog'
import { CorrectOccurredAtDialog } from '@/components/forms/correct-occurred-at-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge, type StatusType } from '@/components/ui/status-badge'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { listExpenses } from '@/modules/expenses/repository'
import { CheckCircle, Paperclip, Plus, Receipt } from '@phosphor-icons/react/dist/ssr'

const currency = new Intl.NumberFormat('vi-VN')

const statusMap: Record<string, StatusType> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
}

export default async function ExpensesPage() {
  const user = await requireUser()
  const client = await createServerSupabaseClient()
  const expenses = await listExpenses(client)

  return (
    <section className="space-y-6" aria-labelledby="expenses-title">
      <PageHeader
        title="Quản Lý Chi Phí"
        description="Ghi nhận và kiểm soát các khoản chi vận hành xưởng. Chỉ khoản chi đã được quản lý phê duyệt mới được tính vào lợi nhuận chính thức."
        actions={
          <>
            {user.role === 'manager' ? (
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-800 shadow-2xs transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                href="/expenses/review"
              >
                <CheckCircle className="h-4 w-4 text-sky-700" weight="bold" />
                <span>Duyệt chi phí</span>
              </Link>
            ) : null}
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-2xs transition hover:bg-sky-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              href="/expenses/new"
            >
              <Plus className="h-4 w-4" weight="bold" />
              <span>Nhập chi phí</span>
            </Link>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-extrabold text-slate-900">
            Danh Sách Khoản Chi
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
            {expenses.length} khoản chi
          </span>
        </div>

        {expenses.length ? (
          <div className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const canEdit =
                expense.status !== 'cancelled' &&
                (user.role === 'manager' || expense.createdBy === user.id)

              return (
                <article
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  key={expense.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-slate-950">
                        {expense.categoryName} · {expense.payee}
                      </p>
                      <StatusBadge
                        size="sm"
                        status={statusMap[expense.status] ?? 'pending'}
                      />
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Ngày vận hành: {expense.operatingDay}
                    </p>

                    {expense.reviewReason ? (
                      <p className="mt-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
                        Lý do từ chối: {expense.reviewReason}
                      </p>
                    ) : null}

                    {expense.attachments.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 text-slate-400" weight="bold" />
                        {expense.attachments.map((attachment) => (
                          <AttachmentButton
                            attachmentId={attachment.id}
                            key={attachment.id}
                            label={attachment.originalName}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2 text-right sm:self-center">
                    <p className="text-lg font-black tabular-nums tracking-tight text-slate-950 sm:text-xl">
                      {currency.format(expense.amountVnd)} đ
                    </p>

                    {canEdit ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <CorrectOccurredAtDialog
                          entityId={expense.id}
                          entityType="expense"
                          label="khoản chi"
                          occurredAt={expense.occurredAt}
                          version={expense.version}
                        />
                        <CancelDocumentDialog
                          entityId={expense.id}
                          entityType="expense"
                          label="khoản chi"
                          version={expense.version}
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Receipt className="h-6 w-6 text-sky-700" weight="duotone" />}
            title="Chưa có khoản chi nào được ghi nhận"
            description="Bấm nút nhập chi phí để lưu các khoản chi phát sinh trong ca làm việc."
            action={
              <Link
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-800"
                href="/expenses/new"
              >
                <Plus className="h-4 w-4" weight="bold" />
                <span>Nhập Chi Phí Mới</span>
              </Link>
            }
          />
        )}
      </div>
    </section>
  )
}
