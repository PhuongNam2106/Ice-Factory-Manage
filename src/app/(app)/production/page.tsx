import Link from 'next/link'
import { CancelDocumentDialog } from '@/components/forms/cancel-document-dialog'
import { ReconciliationCard } from '@/components/production/reconciliation-card'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { listProductionDocuments, listProductionReconciliations } from '@/modules/production/repository'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function ProductionPage() {
  const user = await requireUser()
  const operatingDay = getOperatingDay(new Date())
  const client = await createServerSupabaseClient()
  await ensureOperatingDay(operatingDay, client)
  const [rows, documents] = await Promise.all([
    listProductionReconciliations(client, operatingDay),
    listProductionDocuments(client, operatingDay),
  ])

  return <section className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold text-sky-700">Ngày vận hành {operatingDay}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Sản Xuất Nước Đá</h1><p className="mt-1 text-sm text-slate-600">Nhập theo từng mẻ hoặc tổng cuối ca; hệ thống chỉ tính một nguồn vào tồn kho.</p></div><div className="grid grid-cols-2 gap-3"><Link className="min-h-12 rounded-2xl bg-sky-700 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-sky-700/20" href="/production/new/batch">+ Nhập từng mẻ</Link><Link className="min-h-12 rounded-2xl border border-sky-300 bg-white px-4 py-3 text-center text-sm font-bold text-sky-800" href="/production/new/shift-total">+ Tổng cuối ca</Link></div></header>
    <section aria-labelledby="reconciliation-heading"><h2 className="mb-3 text-lg font-extrabold text-slate-950" id="reconciliation-heading">Đối soát sản lượng</h2>{rows.length ? <div className="grid gap-4 lg:grid-cols-2">{rows.map((row) => <ReconciliationCard isManager={user.role === 'manager'} item={row} key={`${row.machineId}:${row.shiftCode}`} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-bold text-slate-800">Chưa có dữ liệu sản xuất hôm nay.</p><p className="mt-1 text-sm text-slate-500">Bắt đầu bằng cách nhập từng mẻ hoặc tổng cuối ca.</p></div>}</section>
    <section aria-labelledby="production-documents"><h2 className="mb-3 text-lg font-extrabold text-slate-950" id="production-documents">Chứng từ sản xuất</h2><div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">{documents.map((document) => <article className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={document.id}><div><p className="font-bold text-slate-950">{document.label}</p><p className="text-sm text-slate-500">{document.goodBags} bao · {document.status === 'active' ? 'Đang hiệu lực' : 'Đã hủy'}</p></div>{document.status === 'active' && (user.role === 'manager' || document.createdBy === user.id) ? <CancelDocumentDialog entityId={document.id} entityType={document.entityType} label="chứng từ sản xuất" version={document.version} /> : null}</article>)}{documents.length === 0 ? <p className="p-5 text-sm text-slate-500">Chưa có chứng từ.</p> : null}</div></section>
  </section>
}
