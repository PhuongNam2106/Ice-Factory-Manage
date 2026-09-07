import Link from 'next/link'
import { ExpenseReviewCard } from '@/components/expenses/expense-review-card'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireManager } from '@/modules/auth/service'
import { listExpenses } from '@/modules/expenses/repository'
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react/dist/ssr'

export default async function ExpenseReviewPage() {
  await requireManager()
  const client = await createServerSupabaseClient()
  const pending = (await listExpenses(client)).filter(
    (expense) => expense.status === 'pending',
  )

  return (
    <section className="space-y-6">
      <header>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 transition hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          href="/expenses"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          <span>Quay lại Chi phí</span>
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Phê Duyệt Khoản Chi
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          {pending.length} khoản chi đang chờ quản lý xem xét và phê duyệt.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {pending.map((expense) => (
          <ExpenseReviewCard expense={expense} key={expense.id} />
        ))}
      </div>

      {pending.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 font-bold text-emerald-900">
          <CheckCircle className="h-6 w-6 text-emerald-600" weight="fill" />
          <span>Tất cả các khoản chi đã được xử lý. Không còn khoản chi nào chờ duyệt.</span>
        </div>
      ) : null}
    </section>
  )
}
