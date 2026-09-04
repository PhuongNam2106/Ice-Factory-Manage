'use client'

type Props = { action: 'Bắt đầu chạy' | 'Xả đá' | 'Tắt máy'; machineName: string; busy: boolean; onCancel: () => void; onConfirm: () => void }

export function ProductionConfirmDialog({ action, machineName, busy, onCancel, onConfirm }: Props) {
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog">
    <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
      <h3 className="text-lg font-extrabold text-slate-950">Xác nhận {action.toLowerCase()}</h3>
      <p className="mt-2 text-sm text-slate-600">Hệ thống sẽ ghi giờ máy chủ hiện tại cho <strong>{machineName}</strong>.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="min-h-12 rounded-2xl border border-slate-300 font-bold text-slate-700" disabled={busy} onClick={onCancel}>Quay lại</button>
        <button className="min-h-12 rounded-2xl bg-sky-700 font-bold text-white disabled:opacity-50" disabled={busy} onClick={onConfirm}>{busy ? 'Đang ghi…' : 'Xác nhận'}</button>
      </div>
    </div>
  </div>
}
