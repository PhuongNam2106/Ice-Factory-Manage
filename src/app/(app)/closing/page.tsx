import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireManager } from '@/modules/auth/service'
import { listOperatingDays } from '@/modules/closing/repository'

export default async function ClosingPage() {
  await requireManager()
  const days = await listOperatingDays(await createServerSupabaseClient())
  return <section className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Quản lý</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950 sm:text-3xl">Đối Chiếu & Khóa Sổ</h1><p className="mt-1 text-sm text-slate-600">Kiểm tra chứng từ, tồn kho và lưu snapshot bất biến trước khi khóa.</p></header><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">{days.map((item) => <Link className="flex min-h-16 items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0" href={`/closing/${item.day}`} key={item.day}><div><p className="font-bold text-slate-950">{item.day}</p><p className="text-xs text-slate-500">Snapshot phiên bản {item.snapshot_version}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'locked' ? 'bg-slate-200 text-slate-800' : 'bg-emerald-100 text-emerald-800'}`}>{item.status === 'locked' ? 'Đã khóa' : 'Đang mở'}</span></Link>)}</div></section>
}
