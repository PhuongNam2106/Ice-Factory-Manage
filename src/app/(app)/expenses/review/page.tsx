import Link from 'next/link'
import { ExpenseReviewCard } from '@/components/expenses/expense-review-card'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireManager } from '@/modules/auth/service'
import { listExpenses } from '@/modules/expenses/repository'

export default async function ExpenseReviewPage() {
  await requireManager()
  const client = await createServerSupabaseClient()
  const pending = (await listExpenses(client)).filter((expense) => expense.status === 'pending')
  return <section className="space-y-5"><header><Link className="text-sm font-bold text-sky-700" href="/expenses">← Quay lại chi phí</Link><h1 className="mt-2 text-2xl font-extrabold text-slate-950">Duyệt Chi Phí</h1><p className="text-sm text-slate-600">{pending.length} khoản đang chờ quản lý xử lý.</p></header><div className="grid gap-4 lg:grid-cols-2">{pending.map((expense) => <ExpenseReviewCard expense={expense} key={expense.id} />)}</div>{pending.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-900">Không còn khoản chi chờ duyệt.</p> : null}</section>
}
