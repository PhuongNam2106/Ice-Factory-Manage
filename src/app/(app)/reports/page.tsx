import { DownloadSimple, FileXls, ShieldCheck } from '@phosphor-icons/react/dist/ssr'
import { PageHeader } from '@/components/ui/page-header'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { requireUser } from '@/modules/auth/service'

const reports = [
  { path: 'daily', title: 'Tổng hợp ngày', note: 'Doanh thu, chi phí, sản xuất và số bao đã bán theo ngày.', daily: true },
  { path: 'monthly', title: 'Tổng hợp tháng', note: 'Tổng hợp toàn tháng, tách riêng ngày đã khóa và ngày còn mở.' },
  { path: 'sales', title: 'Chi tiết bán hàng', note: 'Bán sỉ, bán lẻ, số bao, đơn giá và trạng thái thanh toán.' },
  { path: 'production', title: 'Chi tiết sản xuất', note: 'Theo ngày, máy chạy, từng lần xả đá và người thực hiện.' },
  { path: 'expenses', title: 'Chi tiết chi phí', note: 'Theo danh mục chi phí, trạng thái duyệt và người nhận tiền.' },
  { path: 'receivables', title: 'Công nợ và thanh toán', note: 'Tuổi nợ khách hàng, số dư còn nợ và lịch sử phiếu thu.' },
  { path: 'loss', title: 'Hao hụt sản xuất', note: 'Tồn đầu, sản xuất, bán hàng, tồn cuối và chênh lệch theo ngày.' },
] as const

export default async function ReportsPage() {
  const user = await requireUser()
  const today = getOperatingDay(new Date())
  const monthStart = `${today.slice(0, 8)}01`

  return (
    <section aria-labelledby="reports-title" className="space-y-6">
      <PageHeader
        badge="Đối soát & Lưu trữ dữ liệu"
        description="Xuất file Excel chuẩn hóa số liệu: giữ số ở dạng số, có bộ lọc tự động, tiêu đề cố định và định danh người xuất"
        title="Xuất Báo Cáo Excel"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <form
            action={`/api/reports/${report.path}`}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition hover:border-slate-300"
            key={report.path}
            method="get"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <FileXls size={20} weight="duotone" />
                </div>
                <h2 className="text-base font-bold text-slate-950">{report.title}</h2>
              </div>
              <p className="mt-2 text-xs text-slate-500 line-clamp-2">{report.note}</p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="min-w-0 text-xs font-semibold text-slate-700">
                  Từ ngày
                  <input
                    autoComplete="off"
                    className="mt-1 min-h-10 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    defaultValue={report.path === 'daily' ? today : monthStart}
                    name="from"
                    required
                    type="date"
                  />
                </label>
                {report.path === 'daily' ? null : (
                  <label className="min-w-0 text-xs font-semibold text-slate-700">
                    Đến ngày
                    <input
                      autoComplete="off"
                      className="mt-1 min-h-10 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      defaultValue={today}
                      name="to"
                      required
                      type="date"
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              type="submit"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>Tải Excel {report.title}</span>
            </button>
          </form>
        ))}
      </div>

      {user.role === 'manager' ? (
        <section aria-labelledby="manager-exports" className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} weight="fill" className="text-amber-700" />
            <h2 className="text-sm font-bold text-amber-950" id="manager-exports">Dữ Liệu Dành Riêng Cho Quản Lý</h2>
          </div>
          <p className="mt-1 text-xs text-amber-900">Nhật ký audit và bản sao lưu chứa toàn bộ dữ liệu xưởng; chỉ tài khoản Quản lý mới có quyền tải.</p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <a
              className="flex min-h-11 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-amber-950 border border-amber-200/80 shadow-2xs hover:bg-amber-50 transition active:scale-[0.99]"
              href="/admin/audit"
            >
              Mở lịch sử audit
            </a>
            <a
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-amber-950 border border-amber-200/80 shadow-2xs hover:bg-amber-50 transition active:scale-[0.99]"
              href={`/api/reports/audit?from=${monthStart}&to=${today}`}
            >
              <DownloadSimple size={14} weight="bold" />
              <span>Tải nhật ký audit</span>
            </a>
            <a
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-900 transition active:scale-[0.99]"
              href="/api/reports/backup"
            >
              <DownloadSimple size={14} weight="bold" />
              <span>Tải bản sao lưu JSON + CSV</span>
            </a>
          </div>
        </section>
      ) : null}
    </section>
  )
}

