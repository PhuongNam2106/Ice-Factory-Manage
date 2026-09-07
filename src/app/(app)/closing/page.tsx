import Link from 'next/link'
import { CaretRight, Lock, LockOpen } from '@phosphor-icons/react/dist/ssr'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { requireManager } from '@/modules/auth/service'
import { listOperatingDays } from '@/modules/closing/repository'

export default async function ClosingPage() {
  await requireManager()
  const days = await listOperatingDays(await createServerSupabaseClient())

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Quản lý chốt ca & đối soát"
        description="Kiểm tra chứng từ, báo cáo hao hụt và lưu snapshot bất biến trước khi khóa đồng thời mọi nghiệp vụ trong ngày"
        title="Đối Chiếu & Khóa Sổ"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
        {days.map((item) => {
          const isLocked = item.status === 'locked'
          return (
            <Link
              className="flex min-h-16 items-center justify-between px-5 py-4 transition hover:bg-slate-50/80 active:bg-slate-100/60"
              href={`/closing/${item.day}`}
              key={item.day}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isLocked ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {isLocked ? <Lock size={20} weight="fill" /> : <LockOpen size={20} weight="fill" />}
                </div>
                <div>
                  <p className="font-bold text-slate-950">Ngày vận hành {item.day}</p>
                  <p className="text-xs text-slate-500">Snapshot phiên bản v{item.snapshot_version}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
                    isLocked ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  }`}
                >
                  {isLocked ? 'Đã khóa sổ' : 'Đang mở'}
                </span>
                <CaretRight size={16} weight="bold" className="text-slate-400" />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

