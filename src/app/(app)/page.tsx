import Link from 'next/link'
import { ensureOperatingDay } from '@/modules/closing/ensure-day'
import { getOperatingDay } from '@/modules/shared/operating-day'

export default async function HomePage() {
  const operatingDay = getOperatingDay(new Date())
  await ensureOperatingDay(operatingDay)

  return (
    <section aria-labelledby="today-title" className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-500/10 via-sky-400/5 to-transparent p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Ngày vận hành: {operatingDay}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl" id="today-title">
            Tổng Quan Vận Hành
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Quản lý nhanh các hoạt động nhập bán hàng, sản xuất và chi phí xưởng đá.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition-all duration-150 hover:bg-sky-700 active:scale-95"
            href="/sales/new/wholesale"
          >
            <span>+ Bán sỉ</span>
          </Link>
          <Link
            className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-5 py-3.5 text-sm font-bold text-sky-800 shadow-xs transition-all duration-150 hover:bg-sky-50 active:scale-95"
            href="/sales/new/retail"
          >
            <span>+ Bán lẻ</span>
          </Link>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Thao tác nhanh</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
            href="/sales/new/wholesale"
          >
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white">
              📦
            </div>
            <span className="text-xs font-bold text-slate-900">Bán sỉ</span>
            <span className="mt-0.5 text-[10px] text-slate-500">Theo đơn vị bao</span>
          </Link>

          <Link
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
            href="/sales/new/retail"
          >
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              🏪
            </div>
            <span className="text-xs font-bold text-slate-900">Bán lẻ</span>
            <span className="mt-0.5 text-[10px] text-slate-500">Tổng hợp theo ca</span>
          </Link>

          <Link
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
            href="/production"
          >
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              ⚙️
            </div>
            <span className="text-xs font-bold text-slate-900">Sản xuất</span>
            <span className="mt-0.5 text-[10px] text-slate-500">Theo mẻ / ca</span>
          </Link>

          <Link
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
            href="/expenses"
          >
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 transition-colors group-hover:bg-amber-600 group-hover:text-white">
              💸
            </div>
            <span className="text-xs font-bold text-slate-900">Chi phí</span>
            <span className="mt-0.5 text-[10px] text-slate-500">Phiếu chi & ảnh</span>
          </Link>

          <Link
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
            href="/receivables"
          >
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              📋
            </div>
            <span className="text-xs font-bold text-slate-900">Thu nợ</span>
            <span className="mt-0.5 text-[10px] text-slate-500">Phiếu thu & nợ</span>
          </Link>

          <Link
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md"
            href="/inventory"
          >
            <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 transition-colors group-hover:bg-teal-600 group-hover:text-white">
              🧊
            </div>
            <span className="text-xs font-bold text-slate-900">Kiểm kho</span>
            <span className="mt-0.5 text-[10px] text-slate-500">Kho đá thành phẩm</span>
          </Link>
        </div>
      </div>

      {/* Summary Card placeholder */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-950">Nhật ký hoạt động trong ngày</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Đang cập nhật</span>
        </div>
        <div className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            📊
          </div>
          <p className="text-sm font-medium text-slate-700">Chưa có giao dịch bán hàng hoặc sản xuất mới trong ngày.</p>
          <p className="mt-1 text-xs text-slate-600">Bấm nút bán sỉ hoặc bán lẻ phía trên để tạo giao dịch đầu tiên.</p>
        </div>
      </div>
    </section>
  )
}
