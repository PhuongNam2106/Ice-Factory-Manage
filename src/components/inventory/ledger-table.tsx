import type { InventoryLedgerItem } from '@/modules/inventory/types'

const kindLabels: Record<InventoryLedgerItem['kind'], string> = {
  opening: 'Tồn đầu',
  production: 'Sản xuất',
  sale: 'Bán hàng',
  adjustment: 'Điều chỉnh',
  reversal: 'Đảo bút toán',
}

function SignedQuantity({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
      {value > 0 ? '+' : ''}{value}
    </span>
  )
}

export function LedgerTable({ rows }: { rows: InventoryLedgerItem[] }) {
  if (!rows.length) {
    return <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Chưa có phát sinh kho.</p>
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-bold text-slate-950">{kindLabels[row.kind]}</p><p className="text-xs text-slate-500">{row.operatingDay}</p></div>
              <SignedQuantity value={row.quantityDeltaBags} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{row.note || row.sourceType}</p>
          </article>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-3">Ngày</th><th className="px-5 py-3">Loại</th><th className="px-5 py-3">Nguồn</th><th className="px-5 py-3 text-right">Số bao</th><th className="px-5 py-3">Ghi chú</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-3">{row.operatingDay}</td><td className="px-5 py-3 font-semibold">{kindLabels[row.kind]}</td><td className="px-5 py-3 text-slate-600">{row.sourceType}</td><td className="px-5 py-3 text-right"><SignedQuantity value={row.quantityDeltaBags} /></td><td className="px-5 py-3 text-slate-600">{row.note || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}
