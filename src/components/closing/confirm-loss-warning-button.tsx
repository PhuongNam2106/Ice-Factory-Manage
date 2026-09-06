'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDailyLossWarningAction } from '@/modules/loss/actions'

export function ConfirmLossWarningButton({ reportId, expectedVersion }: { reportId: string; expectedVersion: number }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    setMessage(null)
    startTransition(async () => {
      const result = await confirmDailyLossWarningAction({ reportId, expectedVersion })
      if (!result.ok) return setMessage(result.error.message)
      setMessage('Đã xác nhận cảnh báo hao hụt. Ngày có thể khóa khi các mục còn lại đã hoàn tất.')
      router.refresh()
    })
  }

  return (
    <section className="space-y-3 rounded-3xl border border-amber-300 bg-amber-50 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Xác nhận của quản lý</p>
        <h2 className="mt-1 font-extrabold text-amber-950">Chấp nhận cảnh báo hao hụt</h2>
        <p className="mt-1 text-sm text-amber-900">Xác nhận rằng bạn đã kiểm tra số liệu chênh lệch vượt ngưỡng. Thao tác được lưu vào lịch sử.</p>
      </div>
      {message ? <p aria-live="polite" className="text-sm font-semibold text-amber-950">{message}</p> : null}
      <button className="min-h-12 w-full rounded-2xl bg-amber-700 px-4 font-bold text-white disabled:opacity-50" disabled={pending} onClick={confirm} type="button">{pending ? 'Đang xác nhận…' : 'Xác nhận cảnh báo hao hụt'}</button>
    </section>
  )
}
