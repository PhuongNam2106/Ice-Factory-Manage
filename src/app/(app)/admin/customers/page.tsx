import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CustomerForm } from '@/components/forms/customer-form'
import { listCustomers } from '@/modules/admin/catalog-service'
import { AuthorizationError, requireManager } from '@/modules/auth/service'

export default async function CustomerAdministrationPage() {
  try { await requireManager() } catch (error) {
    if (error instanceof AuthorizationError) redirect('/')
    throw error
  }
  const customers = await listCustomers()
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-sky-700">Danh mục</p><h1 className="text-3xl font-bold tracking-tight">Khách hàng đầu mối</h1></div><Link className="font-semibold text-sky-700 hover:underline" href="/admin/machines">Quản lý máy sản xuất →</Link></div>
      <CustomerForm />
      <div className="space-y-4">{customers.length ? customers.map((customer) => <CustomerForm customer={customer} key={customer.id} />) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-slate-600">Chưa có khách hàng đầu mối.</p>}</div>
    </section>
  )
}
