import type { ClosingCheck } from '@/modules/closing/types'

export function CheckList({ checks }: { checks: ClosingCheck[] }) {
  if (!checks.length) return <p className="rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-900">✓ Ngày vận hành đã đủ điều kiện khóa sổ.</p>
  return <ul className="space-y-3">{checks.map((check) => <li className={`rounded-2xl border p-4 ${check.code === 'LOSS_REVIEW_REQUIRED' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`} key={check.code}><p className="font-bold">{check.message}</p><p className="mt-1 text-xs">{check.code === 'LOSS_REVIEW_REQUIRED' ? 'Quản lý phải xác nhận cảnh báo hao hụt trước khi khóa sổ.' : 'Phải xử lý trước khi khóa sổ.'}</p></li>)}</ul>
}
