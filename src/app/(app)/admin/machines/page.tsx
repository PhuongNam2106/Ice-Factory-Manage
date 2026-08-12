import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MachineForm } from '@/components/forms/machine-form'
import { listMachines } from '@/modules/admin/catalog-service'
import { AuthorizationError, requireManager } from '@/modules/auth/service'

export default async function MachineAdministrationPage() {
  try { await requireManager() } catch (error) {
    if (error instanceof AuthorizationError) redirect('/')
    throw error
  }
  const machines = await listMachines()
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-sky-700">Danh mục</p><h1 className="text-3xl font-bold tracking-tight">Máy sản xuất</h1></div><Link className="font-semibold text-sky-700 hover:underline" href="/admin/customers">← Quản lý khách hàng</Link></div>
      <MachineForm />
      <div className="space-y-4">{machines.length ? machines.map((machine) => <MachineForm key={machine.id} machine={machine} />) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-slate-600">Chưa có máy sản xuất.</p>}</div>
    </section>
  )
}
