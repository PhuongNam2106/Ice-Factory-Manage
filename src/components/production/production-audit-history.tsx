import type { AuditItem } from '@/modules/audit/repository'

const time = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' })

export function ProductionAuditHistory({ items }: { items: AuditItem[] }) {
  return <details className="rounded-3xl border border-slate-200 bg-white p-4">
    <summary className="cursor-pointer font-extrabold text-slate-950">Lịch sử chỉnh sửa ({items.length})</summary>
    <ol className="mt-4 space-y-3">{items.map((item) => <li className="rounded-2xl bg-slate-50 p-3 text-sm" key={item.id}><p className="font-bold text-slate-900">{item.action}</p><p className="text-slate-500">{time.format(new Date(item.createdAt))} · {item.actorName}</p><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-sky-700">Xem giá trị trước / sau</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({ before: item.before, after: item.after }, null, 2)}</pre></details></li>)}{!items.length ? <li className="text-sm text-slate-500">Chưa có chỉnh sửa nào.</li> : null}</ol>
  </details>
}
