import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CaretRight } from '@phosphor-icons/react/dist/ssr'
import { CustomerForm } from '@/components/forms/customer-form'
import { PageHeader } from '@/components/ui/page-header'
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
      <PageHeader
        actions={
          <Link
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 transition"
            href="/admin/machines"
          >
            <span>Quản lý máy sản xuất</span>
            <CaretRight size={14} weight="bold" />
          </Link>
        }
        badge="Danh mục hệ thống"
        description="Quản lý khách hàng đầu mối, giá sỉ theo bao, thông tin liên hệ và thời hạn công nợ"
        title="Khách Hàng Đầu Mối"
      />

      <CustomerForm />

      <div className="space-y-4">
        {customers.length ? (
          customers.map((customer) => <CustomerForm customer={customer} key={customer.id} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-medium text-slate-500">
            Chưa có khách hàng đầu mối nào trong danh mục.
          </div>
        )}
      </div>
    </section>
  )
}

