import { StockCountForm } from '@/components/forms/stock-count-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getStockBalance } from '@/modules/inventory/repository'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function StockCountPage() {
  await requireUser()
  const operatingDay = getOperatingDay(new Date())
  const client = await createServerSupabaseClient()
  await ensureOperatingDay(operatingDay, client)
  const expectedBags = await getStockBalance(client)

  return <section className="mx-auto max-w-2xl space-y-5"><header><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Ngày {operatingDay}</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">Kiểm Kho Thành Phẩm</h1><p className="mt-1 text-sm text-slate-600">Đếm số bao thực tế. Hệ thống tự tạo một bút toán điều chỉnh đúng bằng phần chênh lệch.</p></header><StockCountForm expectedBags={expectedBags} operatingDay={operatingDay} /></section>
}
