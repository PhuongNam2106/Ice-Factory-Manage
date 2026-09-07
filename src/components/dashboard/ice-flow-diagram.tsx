import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Plus,
  Minus,
  Equals,
  Scales,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react/dist/ssr'

export interface IceFlowDiagramProps {
  openingBags: number | null
  productionBags: number
  soldBags: number
  expectedClosingBags: number | null
  closingBags: number | null
  differenceBags: number | null
  differencePct: number | null
  lossReportExists: boolean
  lossWarningPct: number
  lossRequiresReview: boolean
}

export function IceFlowDiagram({
  openingBags,
  productionBags,
  soldBags,
  expectedClosingBags,
  closingBags,
  differenceBags,
  differencePct,
  lossReportExists,
  lossWarningPct,
  lossRequiresReview,
}: IceFlowDiagramProps) {
  const isLoss = (differenceBags ?? 0) > 0
  const isSurplus = (differenceBags ?? 0) < 0
  const isExact = (differenceBags ?? 0) === 0 && lossReportExists
  const isOverWarning =
    lossRequiresReview ||
    (isLoss && differencePct != null && differencePct > lossWarningPct)

  const diffLabel = isSurplus ? 'Dư kho' : isLoss ? 'Hao hụt' : 'Khớp kho'
  const diffColor = isOverWarning
    ? 'text-rose-700 bg-rose-50 border-rose-200'
    : isExact
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : isSurplus
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-slate-700 bg-slate-50 border-slate-200'

  return (
    <section
      aria-labelledby="ice-flow-title"
      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs sm:p-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="ice-flow-title"
            className="text-base font-extrabold text-slate-950 sm:text-lg"
          >
            Sơ đồ dòng đá trong ngày
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Cân đối: Tồn đầu + Sản xuất − Đã bán = Tồn dự kiến vs Tồn thực tế
          </p>
        </div>
        <Link
          href="/loss"
          className="inline-flex items-center gap-1 self-start rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100"
        >
          <Scales className="h-4 w-4 text-sky-600" weight="bold" />
          <span>Chi tiết hao hụt →</span>
        </Link>
      </div>

      {/* Primary Equation Pipeline */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {/* Step 1: Tồn đầu */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tồn đầu
          </p>
          <p className="my-1.5 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
            {openingBags == null ? '—' : `${openingBags.toLocaleString('vi-VN')}`}
          </p>
          <span className="text-[10px] font-semibold text-slate-400">bao</span>
        </div>

        {/* Operator + */}
        <div className="hidden items-center justify-center lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-2xs">
            <Plus className="h-4 w-4" weight="bold" />
          </div>
        </div>

        {/* Step 2: Tổng sản xuất */}
        <div className="flex flex-col justify-between rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            Sản xuất
          </p>
          <p className="my-1.5 text-xl font-black tabular-nums text-sky-950 sm:text-2xl">
            {productionBags.toLocaleString('vi-VN')}
          </p>
          <span className="text-[10px] font-semibold text-sky-600">từ máy làm đá</span>
        </div>

        {/* Operator - */}
        <div className="hidden items-center justify-center lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-2xs">
            <Minus className="h-4 w-4" weight="bold" />
          </div>
        </div>

        {/* Step 3: Tổng bán */}
        <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Tổng bán
          </p>
          <p className="my-1.5 text-xl font-black tabular-nums text-emerald-950 sm:text-2xl">
            {soldBags.toLocaleString('vi-VN')}
          </p>
          <span className="text-[10px] font-semibold text-emerald-600">sỉ và lẻ</span>
        </div>

        {/* Operator = */}
        <div className="hidden items-center justify-center lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-2xs">
            <Equals className="h-4 w-4" weight="bold" />
          </div>
        </div>

        {/* Step 4: Tồn cuối dự kiến */}
        <div className="col-span-2 flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-3.5 text-center sm:col-span-1 lg:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Tồn dự kiến
          </p>
          <p className="my-1.5 text-xl font-black tabular-nums text-slate-950 sm:text-2xl">
            {expectedClosingBags == null
              ? 'Chưa tính'
              : `${expectedClosingBags.toLocaleString('vi-VN')}`}
          </p>
          <span className="text-[10px] font-semibold text-slate-500">
            công thức sổ sách
          </span>
        </div>
      </div>

      {/* Comparison: Tồn cuối thực tế vs Sai lệch đối soát */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Tồn thực tế */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Tồn cuối thực tế
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">
              {closingBags == null
                ? 'Chưa kiểm đếm'
                : `${closingBags.toLocaleString('vi-VN')} bao`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {closingBags == null
                ? 'Nhân viên cần kiểm kho và nhập tồn cuối'
                : 'Đã nhập vào hệ thống'}
            </p>
          </div>
          {closingBags == null ? (
            <Link
              href="/loss"
              className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-800"
            >
              <span>Nhập tồn</span>
              <ArrowRight className="h-3.5 w-3.5" weight="bold" />
            </Link>
          ) : (
            <CheckCircle className="h-8 w-8 text-emerald-600" weight="fill" />
          )}
        </div>

        {/* Kết quả sai lệch */}
        <div className={`flex items-center justify-between rounded-xl border p-4 ${diffColor}`}>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                Kết quả đối soát: {diffLabel}
              </span>
              {isOverWarning ? (
                <span className="rounded-full bg-rose-200 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-900">
                  Vượt ngưỡng ({lossWarningPct}%)
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {!lossReportExists
                ? 'Chưa đối soát'
                : differenceBags == null
                  ? '0 bao'
                  : `${Math.abs(differenceBags).toLocaleString('vi-VN')} bao`}
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              {!lossReportExists
                ? 'Cần nhập tồn cuối để kích hoạt đối soát'
                : productionBags === 0
                  ? 'Không phát sinh sản xuất (không tính % sai lệch)'
                  : differencePct != null
                    ? `Tỷ lệ sai lệch: ${differencePct.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}% sản lượng`
                    : 'Không tính được tỷ lệ'}
            </p>
          </div>
          <div className="shrink-0">
            {isOverWarning ? (
              <WarningCircle className="h-8 w-8 text-rose-600" weight="fill" />
            ) : isExact ? (
              <CheckCircle className="h-8 w-8 text-emerald-600" weight="fill" />
            ) : isSurplus ? (
              <Warning className="h-8 w-8 text-amber-600" weight="fill" />
            ) : (
              <Scales className="h-8 w-8 text-slate-400" weight="duotone" />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
