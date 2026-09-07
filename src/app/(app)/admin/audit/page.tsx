import { Funnel } from '@phosphor-icons/react/dist/ssr'
import { PageHeader } from '@/components/ui/page-header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { listAuditEvents } from '@/modules/audit/repository'
import { requireManager } from '@/modules/auth/service'

const timestamp = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' })

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireManager()
  const params = await searchParams
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : ''
  const events = await listAuditEvents(await createServerSupabaseClient(), { actor: value('actor'), from: value('from'), to: value('to'), entity: value('entity'), action: value('action') })
  const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'

  return (
    <section aria-labelledby="audit-title" className="space-y-6">
      <PageHeader
        badge="Chỉ dành cho Quản lý"
        description="Hiển thị chi tiết thay đổi trước/sau, định danh người thao tác và lý do. Các trường nhạy cảm luôn được che giấu tự động"
        title="Lịch Sử Audit Hệ Thống"
      />

      <form className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Từ ngày
          <input autoComplete="off" className={inputClass} defaultValue={value('from')} name="from" type="date" />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Đến ngày
          <input autoComplete="off" className={inputClass} defaultValue={value('to')} name="to" type="date" />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Mã người thao tác
          <input autoComplete="off" className={inputClass} defaultValue={value('actor')} name="actor" placeholder="UUID người dùng…" />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Loại dữ liệu
          <input autoComplete="off" className={inputClass} defaultValue={value('entity')} name="entity" placeholder="Ví dụ: sale…" />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Hành động
          <input autoComplete="off" className={inputClass} defaultValue={value('action')} name="action" placeholder="Ví dụ: sale.cancelled…" />
        </label>
        <button
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.99] lg:col-span-5"
          type="submit"
        >
          <Funnel size={14} weight="bold" />
          <span>Lọc Lịch Sử Audit</span>
        </button>
      </form>

      <div className="space-y-3">
        {events.map((event) => (
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs" key={event.id}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words font-extrabold text-slate-950 text-sm">{event.action}</h2>
                <p className="break-all text-xs text-slate-500 font-medium">{event.entityType} · {event.entityId}</p>
              </div>
              <time className="shrink-0 text-xs font-semibold text-slate-500" dateTime={event.createdAt}>
                {timestamp.format(new Date(event.createdAt))}
              </time>
            </div>
            <p className="mt-2 text-xs text-slate-700">
              Người thao tác: <span className="font-bold text-slate-950">{event.actorName}</span>
            </p>
            {event.reason ? (
              <p className="mt-1.5 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-950 border border-amber-200/60">
                Lý do: {event.reason}
              </p>
            ) : null}
            <details className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <summary className="min-h-10 cursor-pointer px-3 py-2.5 text-xs font-bold text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                Xem thay đổi trước / sau
              </summary>
              <div className="grid gap-3 border-t border-slate-200/80 p-3 lg:grid-cols-2 bg-white">
                <div className="min-w-0">
                  <h3 className="text-[11px] font-bold uppercase text-slate-500">Trước</h3>
                  <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs text-slate-100 font-mono">
                    {JSON.stringify(event.before, null, 2) ?? 'Không có'}
                  </pre>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[11px] font-bold uppercase text-slate-500">Sau</h3>
                  <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs text-slate-100 font-mono">
                    {JSON.stringify(event.after, null, 2) ?? 'Không có'}
                  </pre>
                </div>
              </div>
            </details>
          </article>
        ))}
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs font-medium text-slate-500">
            Không có sự kiện phù hợp bộ lọc.
          </p>
        ) : null}
      </div>
    </section>
  )
}

