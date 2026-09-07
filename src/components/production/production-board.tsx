'use client'

import { useEffect, useState } from 'react'
import type { AppUser } from '@/modules/auth/service'
import type { AuditItem } from '@/modules/audit/repository'
import type {
  MachineProductivitySummary,
  ProductionBoardSnapshot,
} from '@/modules/production/types'
import { EmptyState } from '@/components/ui/empty-state'
import { MachineProductionCard } from './machine-production-card'
import { ProductionAuditHistory } from './production-audit-history'
import { useProductionRealtime } from './use-production-realtime'
import {
  Clock,
  Cpu,
  Factory,
  Package,
  PlayCircle,
  Warning,
} from '@phosphor-icons/react'

function duration(seconds: number | null) {
  if (seconds === null) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}g ${minutes}p`
}

export function ProductionBoard({
  initialSnapshot,
  currentUser,
  currentProductionDate,
  summary,
  auditItems,
}: {
  initialSnapshot: ProductionBoardSnapshot
  currentUser: AppUser
  currentProductionDate: string
  summary: MachineProductivitySummary[]
  auditItems: AuditItem[]
}) {
  const { online, realtimeReady, connectionMessage } = useProductionRealtime()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const historical = initialSnapshot.productionDate !== currentProductionDate
  const connected = online && realtimeReady
  const writable = connected && !historical

  const totalBagsAll = summary.reduce((sum, item) => sum + item.totalBags, 0)
  const totalHarvestsAll = summary.reduce((sum, item) => sum + item.harvestCount, 0)
  const runningMachinesCount = summary.filter((item) => item.isRunning).length
  const pendingHarvestsCount = summary.reduce(
    (sum, item) => sum + item.pendingHarvestCount,
    0,
  )

  return (
    <div className="space-y-6">
      {connectionMessage ? (
        <div
          className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-950 sm:text-sm"
          role="status"
        >
          <Warning className="h-5 w-5 shrink-0 text-amber-600" weight="fill" />
          <span>{connectionMessage}</span>
        </div>
      ) : null}

      {historical ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-xs font-bold text-slate-800 sm:text-sm">
          <Clock className="h-5 w-5 shrink-0 text-slate-600" weight="bold" />
          <span>
            Bạn đang xem ngày cũ. Nhân viên chỉ được xem; quản lý vẫn có thể hiệu chỉnh
            nếu ngày sản xuất chưa khóa.
          </span>
        </div>
      ) : null}

      {/* KPI Overview */}
      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="Tổng quan năng suất"
      >
        <div className="rounded-2xl border border-sky-800 bg-sky-950 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              Tổng số bao
            </p>
            <Package className="h-4 w-4 text-sky-400" weight="bold" />
          </div>
          <p className="mt-1 text-2xl font-black tabular-nums sm:text-3xl">
            {totalBagsAll.toLocaleString('vi-VN')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Số lần xả
            </p>
            <Factory className="h-4 w-4 text-slate-400" weight="bold" />
          </div>
          <p className="mt-1 text-2xl font-black tabular-nums text-slate-950 sm:text-3xl">
            {totalHarvestsAll.toLocaleString('vi-VN')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Máy đang chạy
            </p>
            <PlayCircle className="h-4 w-4 text-emerald-600" weight="fill" />
          </div>
          <p className="mt-1 text-2xl font-black tabular-nums text-slate-950 sm:text-3xl">
            {runningMachinesCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Chờ nhập số bao
            </p>
            <Clock className="h-4 w-4 text-amber-600" weight="bold" />
          </div>
          <p
            className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${
              pendingHarvestsCount > 0 ? 'text-amber-700' : 'text-slate-950'
            }`}
          >
            {pendingHarvestsCount}
          </p>
        </div>
      </section>

      {/* Machine Cards */}
      <section className="grid gap-5 xl:grid-cols-2">
        {initialSnapshot.machines.map((machine) => (
          <MachineProductionCard
            isManager={currentUser.role === 'manager'}
            key={machine.id}
            locked={initialSnapshot.status === 'locked'}
            machine={machine}
            managerWritable={connected}
            now={now}
            productionDate={initialSnapshot.productionDate}
            productionEndsAt={initialSnapshot.endsAt}
            reminderMinutes={initialSnapshot.reminderMinutes}
            writable={writable}
          />
        ))}
      </section>

      {!initialSnapshot.machines.length ? (
        <EmptyState
          icon={<Cpu className="h-6 w-6 text-sky-700" weight="duotone" />}
          title="Chưa có máy hoạt động"
          description="Quản lý có thể thêm máy mới trong mục Quản trị hệ thống."
        />
      ) : null}

      {/* Productivity Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs sm:rounded-3xl">
        <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-extrabold text-slate-950">
            Năng suất từng máy
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tổng kết thời gian chạy, thời gian dừng và trung bình số bao
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Máy</th>
                <th className="px-4 py-3.5 text-right">Tổng bao</th>
                <th className="px-4 py-3.5 text-right">Lần xả</th>
                <th className="px-4 py-3.5 text-right">TB bao/lần</th>
                <th className="px-4 py-3.5">Thời gian chạy</th>
                <th className="px-4 py-3.5">Dừng máy</th>
                <th className="px-5 py-3.5">TB giữa 2 lần xả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.map((item) => (
                <tr
                  className="transition-colors hover:bg-slate-50/70"
                  key={item.machineId}
                >
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {item.machineName}
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold tabular-nums text-slate-950">
                    {item.totalBags}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                    {item.harvestCount}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-700">
                    {item.averageBagsPerHarvest ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {duration(item.runtimeSeconds)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {duration(item.downtimeSeconds)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {duration(item.averageHarvestIntervalSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {currentUser.role === 'manager' ? (
        <ProductionAuditHistory items={auditItems} />
      ) : null}
    </div>
  )
}
