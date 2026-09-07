import Link from 'next/link'
import { ExpenseForm } from '@/components/forms/expense-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { listExpenseCategories } from '@/modules/expenses/repository'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'

export default async function NewExpensePage() {
  await requireUser()
  const day = getOperatingDay(new Date())
  const client = await createServerSupabaseClient()
  await ensureOperatingDay(day, client)
  const categories = await listExpenseCategories(client)

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 transition hover:text-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          href="/expenses"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          <span>Quay lại Chi phí</span>
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Nhập Khoản Chi Mới
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Ngày vận hành: <strong className="text-slate-700">{day}</strong>. Khoản chi sẽ
          được lưu ở trạng thái Chờ duyệt.
        </p>
      </header>

      <ExpenseForm categories={categories} />
    </section>
  )
}
