import { ProductionBoard } from '@/components/production/production-board'
import { PageHeader } from '@/components/ui/page-header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listProductionAuditEvents } from '@/modules/audit/repository'
import { requireUser } from '@/modules/auth/service'
import { getProductionDate } from '@/modules/production/production-day'
import { getProductionBoard, getProductionSummary } from '@/modules/production/service'
import { CalendarBlank, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; from?: string; to?: string }>
}) {
  const user = await requireUser()
  const currentProductionDate = getProductionDate(new Date())
  const params = await searchParams
  const requestedDay = params.day
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDay ?? '')
    ? requestedDay!
    : currentProductionDate
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? '')
    ? params.from!
    : selectedDate
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? '')
    ? params.to!
    : selectedDate

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

  return (
    <section className="space-y-6" aria-labelledby="production-heading">
      <PageHeader
        title="Sản Xuất Nước Đá"
        description="Theo dõi máy theo thời gian thực: Bắt đầu, Xả đá, Tắt máy và số bao sản xuất. Ngày sản xuất kéo dài từ 20:00 đến 20:00 hôm sau."
        badge={
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ngày sản xuất {selectedDate}
          </div>
        }
        actions={
          <form className="flex items-end gap-2" method="get">
            <label className="text-xs font-bold text-slate-700">
              <span>Xem ngày</span>
              <input
                className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                defaultValue={selectedDate}
                name="day"
                type="date"
              />
            </label>
            <input name="from" type="hidden" value={from} />
            <input name="to" type="hidden" value={to} />
            <button
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              type="submit"
            >
              <CalendarBlank className="h-4 w-4" weight="bold" />
              <span>Xem</span>
            </button>
          </form>
        }
      />

      {/* Productivity filter bar */}
      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs"
        method="get"
      >
        <input name="day" type="hidden" value={selectedDate} />
        <label className="text-xs font-bold text-slate-700">
          <span>Năng suất từ ngày</span>
          <input
            className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            defaultValue={from}
            name="from"
            type="date"
          />
        </label>
        <label className="text-xs font-bold text-slate-700">
          <span>Đến ngày</span>
          <input
            className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            defaultValue={to}
            name="to"
            type="date"
          />
        </label>
        <button
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-sky-700 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          type="submit"
        >
          <MagnifyingGlass className="h-4 w-4" weight="bold" />
          <span>Lọc năng suất</span>
        </button>
      </form>

      <ProductionBoard
        auditItems={auditItems}
        currentProductionDate={currentProductionDate}
        currentUser={user}
        initialSnapshot={overview}
        summary={summary.data}
      />
    </section>
  )
}
