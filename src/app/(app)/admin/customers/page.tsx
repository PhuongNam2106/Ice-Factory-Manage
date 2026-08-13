import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CustomerForm } from '@/components/forms/customer-form'
import { listCustomers } from '@/modules/admin/catalog-service'
import { AuthorizationError, requireManager } from '@/modules/auth/service'

export default async function CustomerAdministrationPage() {
  try {
    await requireManager()
  } catch (error) {
    if (error instanceof AuthorizationError) redirect('/')
    throw error
  }

  const customers = await listCustomers()

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Danh mục hệ thống
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Khách Hàng Đầu Mối
          </h1>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900"
          href="/admin/machines"
        >
          <span>Quản lý máy sản xuất →</span>
        </Link>
      </div>

      <CustomerForm />

      <div className="space-y-4">
        {customers.length ? (
          customers.map((customer) => <CustomerForm customer={customer} key={customer.id} />)
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có khách hàng đầu mối nào trong danh mục.
          </div>
        )}
      </div>
    </section>
  )
}
