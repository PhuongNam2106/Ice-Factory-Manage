import Link from 'next/link'
import { ProductionShiftForm } from '@/components/forms/production-shift-form'
import { listActiveMachines } from '@/modules/admin/catalog-service'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function NewProductionShiftTotalPage() {
  const operatingDay = getOperatingDay(new Date())
  const machines = await listActiveMachines()
  return <section className="mx-auto max-w-3xl space-y-5"><header><Link className="text-sm font-bold text-sky-700" href="/production">← Quay lại sản xuất</Link><h1 className="mt-2 text-2xl font-extrabold text-slate-950">Nhập tổng cuối ca</h1><p className="text-sm text-slate-600">Ngày {operatingDay}. Tổng cuối ca dùng để đối soát, không cộng thêm vào các mẻ.</p></header>{machines.length ? <ProductionShiftForm machines={machines} operatingDay={operatingDay} /> : <p className="rounded-2xl bg-amber-50 p-4 font-semibold text-amber-900">Chưa có máy đang hoạt động. Quản lý cần tạo máy trước.</p>}</section>
}
