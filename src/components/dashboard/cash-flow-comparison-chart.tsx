import {
  Coins,
  CurrencyCircleDollar,
  HandCoins,
  Receipt,
} from '@phosphor-icons/react/dist/ssr'

export interface CashFlowComparisonChartProps {
  revenueVnd: number
  collectedVnd: number
  approvedExpenseVnd: number
  newDebtVnd: number
}

const currency = new Intl.NumberFormat('vi-VN')

export function CashFlowComparisonChart({
  revenueVnd,
  collectedVnd,
  approvedExpenseVnd,
  newDebtVnd,
}: CashFlowComparisonChartProps) {
  const maxVal = Math.max(revenueVnd, collectedVnd, approvedExpenseVnd, newDebtVnd, 1)

  const items = [
    {
      label: 'Tổng doanh thu',
      value: revenueVnd,
      color: 'bg-slate-900',
      textColor: 'text-slate-900',
      icon: CurrencyCircleDollar,
      note: 'Giá trị toàn bộ đơn bán',
    },
    {
      label: 'Tiền đã thu',
      value: collectedVnd,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      icon: Coins,
      note: 'Tiền mặt & chuyển khoản thực nhận',
    },
    {
      label: 'Chi phí duyệt',
      value: approvedExpenseVnd,
      color: 'bg-amber-600',
      textColor: 'text-amber-700',
      icon: Receipt,
      note: 'Khoản chi đã được quản lý duyệt',
    },
    {
      label: 'Nợ mới phát sinh',
      value: newDebtVnd,
      color: 'bg-sky-600',
      textColor: 'text-sky-700',
      icon: HandCoins,
      note: 'Khách sỉ chưa thanh toán đủ',
    },
  ] as const

  return (
    <section
      aria-labelledby="cashflow-comparison-title"
      className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs sm:p-6"
    >
      <div>
        <div className="flex items-center justify-between">
          <h2
            id="cashflow-comparison-title"
            className="text-base font-extrabold text-slate-950 sm:text-lg"
          >
            Đối chiếu dòng tiền trong ngày
          </h2>
          <span className="text-xs font-bold text-slate-500">Thực thu vs Chi phí</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          So sánh quy mô doanh thu, dòng tiền thu về, chi phí thực tế và nợ phát sinh
        </p>

        <div className="mt-5 space-y-4">
          {items.map(({ label, value, color, textColor, icon: Icon, note }) => {
            const widthPct = Math.max(Math.round((value / maxVal) * 100), value > 0 ? 3 : 0)

            return (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Icon className={`h-4 w-4 ${textColor}`} weight="bold" />
                    <span>{label}</span>
                  </div>
                  <span className="font-black tabular-nums text-slate-950">
                    {currency.format(value)} đ
                  </span>
                </div>

                <div
                  role="img"
                  aria-label={`${label}: ${currency.format(value)} đồng`}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    style={{ width: `${widthPct}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${color}`}
                  />
                </div>

                <p className="text-[10px] text-slate-400">{note}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-3 text-right">
        <span className="text-xs text-slate-500">
          Chênh lệch thu − chi đã duyệt:{' '}
          <strong
            className={`font-black tabular-nums ${
              collectedVnd - approvedExpenseVnd >= 0
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}
          >
            {currency.format(collectedVnd - approvedExpenseVnd)} đ
          </strong>
        </span>
      </div>
    </section>
  )
}
