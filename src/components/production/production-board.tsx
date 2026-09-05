'use client'

import { useEffect, useState } from 'react'
import type { AppUser } from '@/modules/auth/service'
import type { AuditItem } from '@/modules/audit/repository'
import type { MachineProductivitySummary, ProductionBoardSnapshot } from '@/modules/production/types'
import { MachineProductionCard } from './machine-production-card'
import { ProductionAuditHistory } from './production-audit-history'
import { ProductionDayControls } from './production-day-controls'
import { useProductionRealtime } from './use-production-realtime'

function duration(seconds: number | null) {
  if (seconds === null) return '—'
  const hours = Math.floor(seconds / 3600); const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}g ${minutes}p`
}

export function ProductionBoard({ initialSnapshot, currentUser, currentProductionDate, summary, auditItems }: { initialSnapshot: ProductionBoardSnapshot; currentUser: AppUser; currentProductionDate: string; summary: MachineProductivitySummary[]; auditItems: AuditItem[] }) {
  const { online, realtimeReady, connectionMessage } = useProductionRealtime()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer) }, [])
  const historical = initialSnapshot.productionDate !== currentProductionDate
  const connected = online && realtimeReady
  const writable = connected && !historical

  return <div className="space-y-6">
    {connectionMessage ? <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950" role="status">{connectionMessage}</div> : null}
    {historical ? <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm font-bold text-slate-800">Bạn đang xem ngày cũ. Nhân viên chỉ được xem; quản lý vẫn có thể hiệu chỉnh nếu ngày sản xuất chưa khóa.</div> : null}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tổng quan năng suất">
      <div className="rounded-2xl bg-sky-900 p-4 text-white"><p className="text-xs font-bold text-sky-200">TỔNG SỐ BAO</p><p className="mt-1 text-2xl font-extrabold">{summary.reduce((sum, item) => sum + item.totalBags, 0)}</p></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">SỐ LẦN XẢ</p><p className="mt-1 text-2xl font-extrabold">{summary.reduce((sum, item) => sum + item.harvestCount, 0)}</p></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">MÁY ĐANG CHẠY</p><p className="mt-1 text-2xl font-extrabold">{summary.filter((item) => item.isRunning).length}</p></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">CHỜ NHẬP SỐ BAO</p><p className="mt-1 text-2xl font-extrabold">{summary.reduce((sum, item) => sum + item.pendingHarvestCount, 0)}</p></div>
    </section>
    {currentUser.role === 'manager' ? <ProductionDayControls machines={initialSnapshot.machines} productionDate={initialSnapshot.productionDate} status={initialSnapshot.status} writable={connected} /> : null}
    <section className="grid gap-5 xl:grid-cols-2">{initialSnapshot.machines.map((machine) => <MachineProductionCard isManager={currentUser.role === 'manager'} key={machine.id} locked={initialSnapshot.status === 'locked'} machine={machine} managerWritable={connected} now={now} productionDate={initialSnapshot.productionDate} productionEndsAt={initialSnapshot.endsAt} reminderMinutes={initialSnapshot.reminderMinutes} writable={writable} />)}</section>
    {!initialSnapshot.machines.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-bold text-slate-800">Chưa có máy hoạt động.</p><p className="mt-1 text-sm text-slate-500">Quản lý có thể thêm máy trong mục Quản trị.</p></div> : null}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white"><header className="border-b border-slate-100 p-4"><h2 className="font-extrabold text-slate-950">Năng suất từng máy</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Máy</th><th className="p-3">Bao</th><th className="p-3">Lần xả</th><th className="p-3">TB bao/lần</th><th className="p-3">Thời gian chạy</th><th className="p-3">Dừng máy</th><th className="p-3">TB giữa hai lần xả</th></tr></thead><tbody>{summary.map((item) => <tr className="border-t border-slate-100" key={item.machineId}><td className="p-3 font-bold">{item.machineName}</td><td className="p-3">{item.totalBags}</td><td className="p-3">{item.harvestCount}</td><td className="p-3">{item.averageBagsPerHarvest ?? '—'}</td><td className="p-3">{duration(item.runtimeSeconds)}</td><td className="p-3">{duration(item.downtimeSeconds)}</td><td className="p-3">{duration(item.averageHarvestIntervalSeconds)}</td></tr>)}</tbody></table></div></section>
    {currentUser.role === 'manager' ? <ProductionAuditHistory items={auditItems} /> : null}
  </div>
}
