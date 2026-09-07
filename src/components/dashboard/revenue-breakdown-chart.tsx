import { Package, Storefront } from '@phosphor-icons/react/dist/ssr'

export interface RevenueBreakdownChartProps {
  wholesaleRevenueVnd: number
  retailRevenueVnd: number
  totalRevenueVnd: number
}

const currency = new Intl.NumberFormat('vi-VN')

export function RevenueBreakdownChart({
  wholesaleRevenueVnd,
  retailRevenueVnd,
  totalRevenueVnd,
}: RevenueBreakdownChartProps) {
  const hasRevenue = totalRevenueVnd > 0
  const wholesalePct = hasRevenue
    ? Math.round((wholesaleRevenueVnd / totalRevenueVnd) * 1000) / 10
    : 0
  const retailPct = hasRevenue
    ? Math.round((retailRevenueVnd / totalRevenueVnd) * 1000) / 10
    : 0

  return (
    <section
      aria-labelledby="revenue-breakdown-title"
      className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs sm:p-6"
    >
      <div>
        <div className="flex items-center justify-between">
          <h2
            id="revenue-breakdown-title"
            className="text-base font-extrabold text-slate-950 sm:text-lg"
          >
            Cơ cấu doanh thu
          </h2>
          <span className="text-xs font-bold text-slate-500">Hôm nay</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Tỷ trọng bán sỉ cho đầu mối và bán lẻ theo ca
        </p>

        {/* Total revenue display */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tổng doanh thu
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-950 sm:text-3xl">
            {currency.format(totalRevenueVnd)} đ
          </p>
        </div>

        {/* Segmented ratio bar */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-sky-800">
              Bán sỉ: {wholesalePct}%
            </span>
            <span className="text-emerald-800">
              Bán lẻ: {retailPct}%
            </span>
          </div>

          <div
            role="img"
            aria-label={`Tỷ lệ doanh thu: Bán sỉ ${wholesalePct}%, Bán lẻ ${retailPct}%`}
            className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50"
          >
            {hasRevenue ? (
              <>
                <div
                  style={{ width: `${wholesalePct}%` }}
                  className="h-full bg-sky-600 transition-all duration-300"
                />
                <div
                  style={{ width: `${retailPct}%` }}
                  className="h-full bg-emerald-600 transition-all duration-300"
                />
              </>
            ) : (
              <div className="h-full w-full bg-slate-200" />
            )}
          </div>
        </div>

        {/* Category Breakdown Breakdown */}
        <div className="mt-5 space-y-2.5">
          {/* Wholesale */}
          <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Package className="h-4 w-4" weight="bold" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Bán sỉ (Đầu mối)</p>
                <p className="text-[11px] text-slate-500">Giao các đại lý, tàu cá</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black tabular-nums text-sky-950">
                {currency.format(wholesaleRevenueVnd)} đ
              </p>
              <p className="text-[11px] font-bold text-sky-700">{wholesalePct}%</p>
            </div>
          </div>

          {/* Retail */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Storefront className="h-4 w-4" weight="bold" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900">Bán lẻ (Theo ca)</p>
                <p className="text-[11px] text-slate-500">Khách vãng lai, quán xá</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black tabular-nums text-emerald-950">
                {currency.format(retailRevenueVnd)} đ
              </p>
              <p className="text-[11px] font-bold text-emerald-700">{retailPct}%</p>
            </div>
          </div>
        </div>
      </div>

      {!hasRevenue ? (
        <p className="mt-4 text-center text-xs font-semibold text-slate-400">
          Chưa phát sinh giao dịch bán hàng trong ngày
        </p>
      ) : null}
    </section>
  )
}
