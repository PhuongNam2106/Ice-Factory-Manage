import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { MachineForm } from '@/components/forms/machine-form'
import { PageHeader } from '@/components/ui/page-header'
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
      <PageHeader
        actions={
          <Link
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 transition"
            href="/admin/customers"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Quản lý khách hàng</span>
          </Link>
        }
        badge="Danh mục hệ thống"
        description="Quản lý danh sách máy sản xuất đá và trạng thái hoạt động"
        title="Máy Sản Xuất Đá"
      />

      <MachineForm />

      <div className="space-y-4">
        {machines.length ? (
          machines.map((machine) => <MachineForm key={machine.id} machine={machine} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-medium text-slate-500">
            Chưa có máy sản xuất nào trong danh mục.
          </div>
        )}
      </div>
    </section>
  )
}

