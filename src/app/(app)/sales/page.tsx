import Link from 'next/link'
import { CancelDocumentDialog } from '@/components/forms/cancel-document-dialog'
import { CorrectOccurredAtDialog } from '@/components/forms/correct-occurred-at-dialog'
import { SalesDayNavigator } from '@/components/sales/sales-day-navigator'
import { SalesDaySummary } from '@/components/sales/sales-day-summary'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/modules/auth/service'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { resolveSalesOperatingDay } from '@/modules/sales/day-selection'
import { listSalesByDay } from '@/modules/sales/repository'
import { summarizeSales } from '@/modules/sales/summary'
import {
  ArrowCounterClockwise,
  Package,
  Plus,
  ShoppingCartSimple,
  Storefront,
} from '@phosphor-icons/react/dist/ssr'

const currency = new Intl.NumberFormat('vi-VN')
const operatingDayDate = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
})
const saleTime = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Bangkok',
})

function formatOperatingDay(operatingDay: string) {
  return operatingDayDate.format(new Date(`${operatingDay}T00:00:00.000Z`))
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  const user = await requireUser()
  const currentOperatingDay = getOperatingDay(new Date())
  const params = await searchParams
  const operatingDay = resolveSalesOperatingDay(params.day, currentOperatingDay)
  const isCurrentDay = operatingDay === currentOperatingDay
  const supabase = await createServerSupabaseClient()
  const [, sales] = await Promise.all([
    ensureOperatingDay(currentOperatingDay, supabase),
    listSalesByDay(supabase, operatingDay),
  ])
  const summary = summarizeSales(sales)
  const displayDay = formatOperatingDay(operatingDay)

  return (
    <section className="space-y-6">
      <PageHeader
        title="Bán Hàng"
        description="Ghi nhận và quản lý các giao dịch bán sỉ cho đại lý và bán lẻ theo từng ca trực."
        badge={
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${
              isCurrentDay ? 'text-sky-700' : 'text-amber-800'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isCurrentDay ? 'bg-sky-500' : 'bg-amber-500'
              }`}
            />
            Ngày vận hành {displayDay}
          </div>
        }
        actions={
          isCurrentDay ? (
            <>
              <Link
                className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-2xs transition-colors hover:bg-sky-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                href="/sales/new/wholesale"
              >
                <Package aria-hidden="true" className="h-4 w-4" weight="bold" />
                <span>Nhập Bán Sỉ</span>
              </Link>
              <Link
                className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-800 shadow-2xs transition-colors hover:bg-sky-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                href="/sales/new/retail"
              >
                <Storefront aria-hidden="true" className="h-4 w-4 text-sky-700" weight="bold" />
                <span>Nhập Bán Lẻ</span>
              </Link>
            </>
          ) : (
            <Link
              className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-2xs transition-colors hover:bg-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              href="/sales"
            >
              <ArrowCounterClockwise aria-hidden="true" className="h-4 w-4" weight="bold" />
              <span>Về hôm nay để nhập</span>
            </Link>
          )
        }
      />

      <SalesDayNavigator
        currentDay={currentOperatingDay}
        selectedDay={operatingDay}
      />

      <SalesDaySummary summary={summary} />

      <section
        aria-labelledby="sales-day-heading"
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2
            className="text-base font-extrabold text-slate-900"
            id="sales-day-heading"
          >
            Giao dịch ngày {displayDay}
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
            {sales.length} giao dịch
          </span>
        </div>

        {sales.length ? (
          <ul className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <li
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                key={sale.id}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-2xs ${
                      sale.kind === 'wholesale'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {sale.kind === 'wholesale' ? (
                      <Package aria-hidden="true" className="h-5 w-5" weight="duotone" />
                    ) : (
                      <Storefront aria-hidden="true" className="h-5 w-5" weight="duotone" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-slate-900">
                        {sale.kind === 'wholesale'
                          ? sale.customerName ?? 'Bán sỉ thu đủ'
                          : `Bán lẻ · Ca ${sale.shiftCode}`}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          sale.kind === 'wholesale'
                            ? 'border border-sky-200 bg-sky-50 text-sky-800'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {sale.kind === 'wholesale' ? 'Bán sỉ' : 'Bán lẻ'}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Đã thu:{' '}
                      <span className="font-bold text-slate-700">
                        {currency.format(sale.paidNowVnd)} đ
                      </span>
                      <span className="mx-2 text-slate-300">•</span>
                      Trạng thái:{' '}
                      <span
                        className={`font-bold ${
                          sale.status === 'active'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {sale.status === 'active' ? 'Đang hiệu lực' : 'Đã hủy'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-right sm:self-center">
                  <p className="text-lg font-black tabular-nums tracking-tight text-slate-950 sm:text-xl">
                    {currency.format(sale.totalVnd)} đ
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {saleTime.format(new Date(sale.occurredAt))}
                  </p>
                  {sale.status === 'active' &&
                  (user.role === 'manager' || sale.createdBy === user.id) ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <CorrectOccurredAtDialog
                        entityId={sale.id}
                        entityType="sale"
                        label="đơn bán"
                        occurredAt={sale.occurredAt}
                        version={sale.version}
                      />
                      <CancelDocumentDialog
                        entityId={sale.id}
                        entityType="sale"
                        label="đơn bán"
                        version={sale.version}
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ShoppingCartSimple aria-hidden="true" className="h-6 w-6 text-sky-700" weight="duotone" />}
            title={`Chưa có giao dịch bán hàng nào trong ngày ${displayDay}`}
            description={
              isCurrentDay
                ? 'Bấm nút nhập bán sỉ hoặc bán lẻ phía trên để thêm giao dịch vào hệ thống.'
                : 'Bạn có thể chọn ngày khác để tiếp tục tra cứu lịch sử bán hàng.'
            }
            action={isCurrentDay ? (
              <div className="flex gap-2">
                <Link
                  className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  href="/sales/new/wholesale"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" weight="bold" />
                  <span>Nhập Bán Sỉ</span>
                </Link>
                <Link
                  className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  href="/sales/new/retail"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" weight="bold" />
                  <span>Nhập Bán Lẻ</span>
                </Link>
              </div>
            ) : undefined}
          />
        )}
      </section>
    </section>
  )
}
