import Link from 'next/link'
import { ExpenseForm } from '@/components/forms/expense-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { listExpenseCategories } from '@/modules/expenses/repository'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function NewExpensePage() {
  await requireUser()
  const day = getOperatingDay(new Date())
  const client = await createServerSupabaseClient()
  await ensureOperatingDay(day, client)
  const categories = await listExpenseCategories(client)

  return <section className="mx-auto max-w-3xl space-y-5"><header><Link className="text-sm font-bold text-sky-700" href="/expenses">← Quay lại chi phí</Link><h1 className="mt-2 text-2xl font-extrabold text-slate-950">Nhập Chi Phí</h1><p className="text-sm text-slate-600">Ngày {day}. Khoản chi được lưu ở trạng thái Chờ duyệt.</p></header><ExpenseForm categories={categories} operatingDay={day} /></section>
}
