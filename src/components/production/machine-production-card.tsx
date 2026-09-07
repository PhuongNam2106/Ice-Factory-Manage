'use client'

import { useState } from 'react'
import Link from 'next/link'
import { recordHarvest, startMachine, stopMachine } from '@/modules/production/actions'
import { getRunOvertimeLevel, isHarvestReminderDue } from '@/modules/production/presentation'
import type { MachineProductionState } from '@/modules/production/types'
import { HarvestQuantityForm } from './harvest-quantity-form'
import { ProductionConfirmDialog } from './production-confirm-dialog'
import {
  ArrowRight,
  Clock,
  PlayCircle,
  Snowflake,
  StopCircle,
  Warning,
} from '@phosphor-icons/react'

const labels = { start: 'Bắt đầu chạy', harvest: 'Xả đá', stop: 'Tắt máy' } as const
const time = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
})

export function MachineProductionCard({
  machine,
  now,
  writable,
  managerWritable,
  locked,
  reminderMinutes,
  productionDate,
  productionEndsAt,
  isManager,
}: {
  machine: MachineProductionState
  now: Date
  writable: boolean
  managerWritable: boolean
  locked: boolean
  reminderMinutes: number
  productionDate: string
  productionEndsAt: string
  isManager: boolean
}) {
  const [confirm, setConfirm] = useState<{
    action: keyof typeof labels
    actionAt: Date
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const running = Boolean(machine.openRun)
  const hasPending = Boolean(machine.pendingHarvest)
  const commonReason = locked
    ? 'Ngày sản xuất đã khóa.'
    : !writable
      ? 'Chưa có kết nối đồng bộ an toàn.'
      : null

  const reasons = {
    start:
      commonReason ??
      (running ? 'Máy đang chạy; hãy tắt máy trước khi bắt đầu phiên mới.' : null),
    harvest:
      commonReason ??
      (!running
        ? 'Phải bắt đầu máy trước khi xả đá.'
        : hasPending
          ? 'Lần xả gần nhất chưa có số bao; hãy cập nhật trước khi xả tiếp.'
          : null),
    stop: commonReason ?? (!running ? 'Máy hiện đang dừng.' : null),
  }

  const pendingDue = machine.pendingHarvest
    ? isHarvestReminderDue(
        new Date(machine.pendingHarvest.harvestedAt),
        now,
        reminderMinutes,
      )
    : false
  const overtime = machine.openRun
    ? getRunOvertimeLevel(now, new Date(productionEndsAt))
    : 'none'
  const quantityWritable = isManager ? managerWritable : writable

  async function execute() {
    if (!confirm) return
    setBusy(true)
    setMessage(null)
    const input = { machineId: machine.id, idempotencyKey: crypto.randomUUID() }
    const result =
      confirm.action === 'start'
        ? await startMachine(input)
        : confirm.action === 'harvest'
          ? await recordHarvest(input)
          : await stopMachine(input)
    setBusy(false)
    setConfirm(null)
    setMessage(
      result.ok
        ? `Đã ghi nhận ${labels[confirm.action].toLowerCase()}.`
        : result.error.message,
    )
  }

  const actionIcons = {
    start: <PlayCircle className="h-4 w-4 shrink-0" weight="fill" />,
    harvest: <Snowflake className="h-4 w-4 shrink-0" weight="bold" />,
    stop: <StopCircle className="h-4 w-4 shrink-0" weight="fill" />,
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-all hover:border-slate-300 sm:rounded-3xl">
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {machine.code}
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold text-slate-950">
            {machine.name}
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            running
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-slate-200 bg-slate-100 text-slate-700'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              running ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          <span>{running ? 'Đang chạy' : 'Đang dừng'}</span>
        </span>
      </header>

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(['start', 'harvest', 'stop'] as const).map((action) => {
            const isDisabled = Boolean(reasons[action]) || busy
            const btnColor =
              action === 'start'
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
                : action === 'harvest'
                  ? 'bg-sky-700 hover:bg-sky-800 active:bg-sky-900 shadow-sky-700/20'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-600/20'

            return (
              <button
                key={action}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-extrabold text-white shadow-2xs transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:min-h-14 sm:text-sm ${btnColor}`}
                disabled={isDisabled}
                onClick={() => setConfirm({ action, actionAt: new Date() })}
                title={reasons[action] ?? undefined}
                type="button"
              >
                {actionIcons[action]}
                <span>{labels[action]}</span>
              </button>
            )
          })}
        </div>

        {Object.entries(reasons).some(([, reason]) => reason) ? (
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {Object.entries(reasons)
              .filter(([, reason]) => reason)
              .map(([action, reason]) => (
                <li key={action} className="flex items-start gap-1">
                  <strong className="shrink-0 text-slate-700">
                    {labels[action as keyof typeof labels]}:
                  </strong>{' '}
                  <span>{reason}</span>
                </li>
              ))}
          </ul>
        ) : null}

        {overtime !== 'none' ? (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs font-bold ${
              overtime === 'critical'
                ? 'border border-rose-200 bg-rose-50 text-rose-900'
                : 'border border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <Warning className="h-4 w-4 shrink-0" weight="fill" />
            <span>
              Máy vẫn đang chạy quá giờ kết thúc ngày sản xuất. Dữ liệu tiếp tục thuộc
              ngày đã bắt đầu máy.
            </span>
          </div>
        ) : null}

        {machine.pendingHarvest ? (
          <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-amber-700" weight="bold" />
              {pendingDue ? (
                <p className="text-xs font-extrabold text-amber-900">
                  Đã hơn {reminderMinutes} phút từ lúc xả — vui lòng tổng kết số bao.
                </p>
              ) : (
                <p className="text-xs font-bold text-amber-900">
                  Đang chờ tổng kết số bao cho lần xả lúc{' '}
                  {time.format(new Date(machine.pendingHarvest.harvestedAt))}.
                </p>
              )}
            </div>
            <HarvestQuantityForm
              disabled={!quantityWritable || locked}
              harvestId={machine.pendingHarvest.id}
            />
          </div>
        ) : null}

        {message ? (
          <p
            aria-live="polite"
            className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-bold text-sky-900"
          >
            {message}
          </p>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 p-4">
        <p className="text-xs font-bold text-slate-700 sm:text-sm">
          <span className="font-extrabold text-sky-800">{machine.totalBags} bao</span> /{' '}
          {machine.harvestCount} lần xả
        </p>
        <Link
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          href={`/production/machines/${machine.id}?day=${productionDate}`}
        >
          <span>Nhật ký máy</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" weight="bold" />
        </Link>
      </footer>

      {confirm ? (
        <ProductionConfirmDialog
          action={labels[confirm.action]}
          actionAt={confirm.actionAt}
          busy={busy}
          machineName={machine.name}
          onCancel={() => setConfirm(null)}
          onConfirm={execute}
        />
      ) : null}
    </article>
  )
}
