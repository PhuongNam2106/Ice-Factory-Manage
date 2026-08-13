import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MachineForm } from '@/components/forms/machine-form'
import { listMachines } from '@/modules/admin/catalog-service'
import { AuthorizationError, requireManager } from '@/modules/auth/service'

export default async function MachineAdministrationPage() {
  try {
    await requireManager()
  } catch (error) {
    if (error instanceof AuthorizationError) redirect('/')
    throw error
  }

  const machines = await listMachines()

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Danh mục hệ thống
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Máy Sản Xuất Đá
          </h1>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900"
          href="/admin/customers"
        >
          <span>← Quản lý khách hàng</span>
        </Link>
      </div>

      <MachineForm />

      <div className="space-y-4">
        {machines.length ? (
          machines.map((machine) => <MachineForm key={machine.id} machine={machine} />)
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có máy sản xuất nào trong danh mục.
          </div>
        )}
      </div>
    </section>
  )
}
