import Link from 'next/link'
import { LedgerTable } from '@/components/inventory/ledger-table'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { getStockBalance, listInventoryLedger, listStockCounts } from '@/modules/inventory/repository'

export default async function InventoryPage() {
  await requireUser()
  const client = await createServerSupabaseClient()
  const [balance, ledger, counts] = await Promise.all([
    getStockBalance(client),
    listInventoryLedger(client),
    listStockCounts(client),
  ])
  const latestCount = counts[0] ?? null

  return <section className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Kho thành phẩm</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950 sm:text-3xl">Tồn Kho Nước Đá</h1><p className="mt-1 text-sm text-slate-600">Số dư được tính từ sổ phát sinh bất biến theo đơn vị bao.</p></div><Link className="min-h-12 rounded-2xl bg-sky-700 px-5 py-3 text-center text-sm font-bold text-white" href="/inventory/count">+ Kiểm kho</Link></header>
    <div className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Tồn hiện tại</p><p className="mt-2 text-4xl font-extrabold">{balance}</p><p className="mt-1 text-sm text-slate-300">bao thành phẩm</p></article>
      <article className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kiểm gần nhất</p><p className="mt-2 text-2xl font-extrabold text-slate-950">{latestCount ? `${latestCount.actualBags} bao` : 'Chưa kiểm'}</p><p className="mt-1 text-sm text-slate-500">{latestCount?.operatingDay ?? '—'}</p></article>
      <article className={`rounded-3xl border p-5 ${latestCount?.requiresReview ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Chênh lệch gần nhất</p><p className="mt-2 text-2xl font-extrabold text-slate-950">{latestCount ? `${latestCount.varianceBags > 0 ? '+' : ''}${latestCount.varianceBags} bao` : '—'}</p><p className="mt-1 text-sm text-slate-600">{latestCount?.variancePct == null ? 'Không xác định %' : `${latestCount.variancePct}%`}</p></article>
    </div>
    <section><h2 className="mb-3 text-lg font-extrabold text-slate-950">Sổ nhập xuất điều chỉnh</h2><LedgerTable rows={ledger} /></section>
  </section>
}
