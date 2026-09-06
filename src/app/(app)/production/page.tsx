import { ProductionBoard } from '@/components/production/production-board'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listProductionAuditEvents } from '@/modules/audit/repository'
import { requireUser } from '@/modules/auth/service'
import { getProductionDate } from '@/modules/production/production-day'
import { getProductionBoard, getProductionSummary } from '@/modules/production/service'

export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ day?: string; from?: string; to?: string }> }) {
  const user = await requireUser()
  const currentProductionDate = getProductionDate(new Date())
  const params = await searchParams
  const requestedDay = params.day
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDay ?? '') ? requestedDay! : currentProductionDate
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? '') ? params.from! : selectedDate
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? '') ? params.to! : selectedDate
  const client = await createServerSupabaseClient()
  const [board, summary, auditItems] = await Promise.all([
    getProductionBoard(client, selectedDate),
    getProductionSummary(client, from, to),
    user.role === 'manager' ? listProductionAuditEvents(client) : Promise.resolve([]),
  ])
  if (!board.ok) throw new Error(board.error.message)
  if (!summary.ok) throw new Error(summary.error.message)
  const overview = {
    ...board.data,
    machines: board.data.machines.map((machine) => ({ ...machine, logs: [] })),
  }

  return <section className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Ngày sản xuất {selectedDate}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Theo dõi máy làm nước đá</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">Ghi thời điểm bắt đầu, xả đá, tắt máy và số bao theo từng máy. Ngày sản xuất kéo dài từ 20:00 đến 20:00 hôm sau.</p></div>
      <form className="flex items-end gap-2" method="get"><label className="text-sm font-bold text-slate-700">Xem ngày<input className="mt-1 block min-h-12 rounded-xl border border-slate-300 bg-white px-3" defaultValue={selectedDate} name="day" type="date" /></label><input name="from" type="hidden" value={from} /><input name="to" type="hidden" value={to} /><button className="min-h-12 rounded-xl bg-slate-900 px-4 font-bold text-white" type="submit">Xem</button></form>
    </header>
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4" method="get"><input name="day" type="hidden" value={selectedDate} /><label className="text-sm font-bold">Năng suất từ<input className="mt-1 block min-h-11 rounded-xl border border-slate-300 px-3" defaultValue={from} name="from" type="date" /></label><label className="text-sm font-bold">Đến<input className="mt-1 block min-h-11 rounded-xl border border-slate-300 px-3" defaultValue={to} name="to" type="date" /></label><button className="min-h-11 rounded-xl bg-sky-700 px-4 font-bold text-white">Xem năng suất</button></form>
    <ProductionBoard auditItems={auditItems} currentProductionDate={currentProductionDate} currentUser={user} initialSnapshot={overview} summary={summary.data} />
  </section>
}
