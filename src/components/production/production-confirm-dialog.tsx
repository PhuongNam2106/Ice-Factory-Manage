'use client'

type Props = { action: 'Bắt đầu chạy' | 'Xả đá' | 'Tắt máy'; actionAt: Date; machineName: string; busy: boolean; onCancel: () => void; onConfirm: () => void }

const actionTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
})
const actionDate = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Bangkok',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function ProductionConfirmDialog({ action, actionAt, machineName, busy, onCancel, onConfirm }: Props) {
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog">
    <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
      <h3 className="text-lg font-extrabold text-slate-950">Xác nhận {action.toLowerCase()}</h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-2xl bg-slate-50 p-3 text-sm">
        <dt className="font-semibold text-slate-500">Máy</dt><dd className="font-extrabold text-slate-950">{machineName}</dd>
        <dt className="font-semibold text-slate-500">Thời gian</dt><dd className="font-extrabold tabular-nums text-slate-950">{actionTime.format(actionAt)} · {actionDate.format(actionAt)}</dd>
      </dl>
      <p className="mt-3 text-xs text-slate-500">Thời gian chính xác được máy chủ ghi nhận khi bạn xác nhận.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="min-h-12 rounded-2xl border border-slate-300 font-bold text-slate-700" disabled={busy} onClick={onCancel}>Quay lại</button>
        <button className="min-h-12 rounded-2xl bg-sky-700 font-bold text-white disabled:opacity-50" disabled={busy} onClick={onConfirm}>{busy ? 'Đang ghi…' : 'Xác nhận'}</button>
      </div>
    </div>
  </div>
}
