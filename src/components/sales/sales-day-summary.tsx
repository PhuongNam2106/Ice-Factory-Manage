import type { SalesDaySummaryData } from '@/modules/sales/summary'

const currency = new Intl.NumberFormat('vi-VN')

export function SalesDaySummary({ summary }: { summary: SalesDaySummaryData }) {
  return (
    <section
      aria-label="Tổng hợp bán hàng trong ngày"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Giao dịch
        </p>
        <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">
          {summary.totalTransactions} giao dịch
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {summary.activeTransactions} đang hiệu lực
          {summary.cancelledTransactions > 0 ? (
            <span className="ml-2 text-rose-700">
              · {summary.cancelledTransactions} đã hủy
            </span>
          ) : null}
        </p>
      </article>

      <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-2xs">
        <p className="text-xs font-extrabold uppercase tracking-wide text-sky-700">
          Tổng bán sỉ
        </p>
        <p className="mt-2 text-2xl font-black tabular-nums text-sky-950">
          {currency.format(summary.wholesaleRevenueVnd)} đ
        </p>
        <p className="mt-1 text-xs font-semibold text-sky-700">
          Giao dịch đang hiệu lực
        </p>
      </article>

      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-2xs">
        <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">
          Tổng bán lẻ
        </p>
        <p className="mt-2 text-2xl font-black tabular-nums text-emerald-950">
          {currency.format(summary.retailRevenueVnd)} đ
        </p>
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          Giao dịch đang hiệu lực
        </p>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-2xs">
        <p className="text-xs font-extrabold uppercase tracking-wide text-sky-300">
          Tổng doanh thu
        </p>
        <p className="mt-2 text-2xl font-black tabular-nums">
          {currency.format(summary.totalRevenueVnd)} đ
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-300">
          Chỉ tính giao dịch đang hiệu lực
        </p>
      </article>
    </section>
  )
}
