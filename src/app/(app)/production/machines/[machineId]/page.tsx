import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MachineLogScreen } from '@/components/production/machine-log-screen'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { getProductionDate } from '@/modules/production/production-day'
import { getProductionBoard } from '@/modules/production/service'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function MachineLogPage({ params, searchParams }: { params: Promise<{ machineId: string }>; searchParams: Promise<{ day?: string }> }) {
  const user = await requireUser()
  const [{ machineId }, query] = await Promise.all([params, searchParams])
  if (!uuidPattern.test(machineId)) notFound()

  const currentProductionDate = getProductionDate(new Date())
  const productionDate = /^\d{4}-\d{2}-\d{2}$/.test(query.day ?? '') ? query.day! : currentProductionDate
  const client = await createServerSupabaseClient()
  const board = await getProductionBoard(client, productionDate)
  if (!board.ok) throw new Error(board.error.message)
  const machine = board.data.machines.find((item) => item.id === machineId)
  if (!machine) notFound()

  return <section className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Ngày sản xuất {productionDate}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Nhật ký máy</h1><p className="mt-1 text-sm text-slate-600">Theo dõi và hiệu chỉnh từng hành động của {machine.name}.</p></div>
      <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" href={`/production?day=${productionDate}`}>← Quay lại danh sách máy</Link>
    </header>
    <MachineLogScreen currentProductionDate={currentProductionDate} isManager={user.role === 'manager'} locked={board.data.status === 'locked'} machine={machine} productionDate={productionDate} />
  </section>
}
