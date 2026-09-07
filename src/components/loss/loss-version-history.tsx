import type { Json } from '@/lib/supabase/database.types'
import type { DailyLossVersionItem } from '@/modules/loss/types'

function snapshotValue(snapshot: Json, key: string, legacyKey: string) {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') return '—'
  const value = snapshot[key] ?? snapshot[legacyKey]
  return typeof value === 'number' || typeof value === 'string' ? value : '—'
}

export function LossVersionHistory({ items }: { items: DailyLossVersionItem[] }) {
  return (
    <section aria-labelledby="loss-versions-title" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Dành cho quản lý</p>
        <h2 className="mt-1 text-lg font-extrabold text-slate-950" id="loss-versions-title">Lịch sử chỉnh sửa</h2>
        <p className="mt-1 text-sm text-slate-600">Mỗi lần lưu tạo một phiên bản bất biến để truy vết số liệu.</p>
      </div>
      {items.length === 0 ? <p className="mt-4 text-sm font-semibold text-slate-500">Chưa có phiên bản đã lưu.</p> : (
        <ol className="mt-5 space-y-3">
          {items.map((item) => (
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.version}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold text-slate-950">Phiên bản {item.version}</p>
                <time className="text-xs font-semibold text-slate-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })}</time>
              </div>
              <p className="mt-1 text-sm text-slate-600">Người cập nhật: <span className="font-bold text-slate-800">{item.editorName}</span></p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {[
                  ['Tồn đầu', snapshotValue(item.snapshot, 'openingBags', 'opening_bags')],
                  ['Sản xuất', snapshotValue(item.snapshot, 'producedBags', 'produced_bags')],
                  ['Đã bán', snapshotValue(item.snapshot, 'soldBags', 'sold_bags')],
                  ['Tồn cuối', snapshotValue(item.snapshot, 'closingBags', 'closing_bags')],
                ].map(([label, value]) => <div className="rounded-xl bg-white p-3" key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-bold text-slate-950">{String(value)} bao</dd></div>)}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
