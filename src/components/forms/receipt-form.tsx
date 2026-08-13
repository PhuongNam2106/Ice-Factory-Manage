'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { recordReceipt } from '@/modules/receivables/actions'
import type { ReceivableListItem } from '@/modules/receivables/types'

const currency = new Intl.NumberFormat('vi-VN')

export function ReceiptForm({
  customerId,
  customerName,
  openReceivables,
  operatingDay,
}: {
  customerId: string
  customerName: string
  openReceivables: ReceivableListItem[]
  operatingDay: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const idempotencyKey = useRef(createIdempotencyKey())
  const [amountVnd, setAmountVnd] = useState<string>('')
  const [allocations, setAllocations] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalReceiptAmount = Number(amountVnd || 0)
  const totalAllocatedAmount = useMemo(
    () => Object.values(allocations).reduce((sum, val) => sum + Number(val || 0), 0),
    [allocations],
  )
  const unallocatedAmount = totalReceiptAmount - totalAllocatedAmount

  function updateAllocation(receivableId: string, val: string) {
    setAllocations((prev) => ({ ...prev, [receivableId]: val }))
  }

  function autoDistribute() {
    let remaining = totalReceiptAmount
    const nextAllocations: Record<string, string> = {}

    for (const rec of openReceivables) {
      if (remaining <= 0) break
      const alloc = Math.min(remaining, rec.outstandingAmountVnd)
      if (alloc > 0) {
        nextAllocations[rec.id] = String(alloc)
        remaining -= alloc
      }
    }

    setAllocations(nextAllocations)
  }

  function submit(formData: FormData) {
    setMessage(null)

    const activeAllocations = Object.entries(allocations)
      .map(([receivableId, val]) => ({ receivableId, amountVnd: Number(val || 0) }))
      .filter((item) => item.amountVnd > 0)

    startTransition(async () => {
      const result = await recordReceipt({
        customerId,
        operatingDay,
        amountVnd: totalReceiptAmount,
        paymentMethod: formData.get('paymentMethod') === 'bank_transfer' ? 'bank_transfer' : 'cash',
        note: String(formData.get('note') ?? ''),
        allocations: activeAllocations,
        idempotencyKey: idempotencyKey.current,
      })

      if (!result.ok) {
        setMessage(result.error.message)
        return
      }

      setMessage('Đã lập phiếu thu tiền thành công!')
      idempotencyKey.current = createIdempotencyKey()
      formRef.current?.reset()
      setAmountVnd('')
      setAllocations({})
    })
  }

  return (
    <form action={submit} className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs sm:p-8" noValidate ref={formRef}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Lập Phiếu Thu Tiền</h2>
          <p className="text-xs text-slate-500">Khách hàng: <span className="font-semibold text-slate-900">{customerName}</span></p>
        </div>
        <div className="text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200/60 self-start sm:self-auto">
          Ngày vận hành: {operatingDay}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Số tiền thu (VNĐ)
          </label>
          <input
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            inputMode="numeric"
            min="1"
            onChange={(e) => setAmountVnd(e.target.value)}
            placeholder="Ví dụ: 500000"
            required
            type="number"
            value={amountVnd}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Phương thức thanh toán
          </label>
          <select
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            defaultValue="cash"
            name="paymentMethod"
          >
            <option value="cash">💵 Tiền mặt</option>
            <option value="bank_transfer">🏦 Chuyển khoản ngân hàng</option>
          </select>
        </div>
      </div>

      {/* Allocation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Phân bổ tiền thu vào các khoản nợ
          </label>
          {openReceivables.length > 0 && totalReceiptAmount > 0 ? (
            <button
              className="text-xs font-bold text-sky-700 hover:text-sky-900 underline"
              onClick={autoDistribute}
              type="button"
            >
              ⚡ Phân bổ tự động từ cũ nhất
            </button>
          ) : null}
        </div>

        {openReceivables.length ? (
          <div className="space-y-3">
            {openReceivables.map((rec) => {
              const currentAlloc = allocations[rec.id] || ''

              return (
                <div
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={rec.id}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Đơn bán sỉ ngày {rec.operatingDay} (Hạn trả: {rec.dueDate})
                    </p>
                    <p className="text-xs text-slate-500">
                      Gốc: {currency.format(rec.originalAmountVnd)} đ · Dư nợ: <span className="font-bold text-rose-700">{currency.format(rec.outstandingAmountVnd)} đ</span>
                    </p>
                  </div>

                  <div className="w-full sm:w-48">
                    <input
                      aria-label={`Phân bổ cho khoản nợ ngày ${rec.operatingDay}`}
                      className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      inputMode="numeric"
                      max={rec.outstandingAmountVnd}
                      min="0"
                      onChange={(e) => updateAllocation(rec.id, e.target.value)}
                      placeholder="Số tiền trừ nợ"
                      type="number"
                      value={currentAlloc}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Khách hàng hiện không có khoản nợ mở nào để phân bổ.</p>
        )}

        {/* Allocation Summary Bar */}
        <div className="flex flex-col gap-2 rounded-2xl bg-sky-50/80 p-4 text-xs font-semibold text-sky-950 ring-1 ring-sky-200/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Đã phân bổ: <span className="font-extrabold text-sky-900">{currency.format(totalAllocatedAmount)} VNĐ</span>
          </div>
          <div>
            Tiền dư chưa phân bổ: <span className={`font-extrabold ${unallocatedAmount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{currency.format(Math.max(0, unallocatedAmount))} VNĐ</span>
          </div>
        </div>

        {unallocatedAmount < 0 ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">
            ⚠️ Tổng số tiền phân bổ ({currency.format(totalAllocatedAmount)}đ) vượt quá số tiền thực thu ({currency.format(totalReceiptAmount)}đ).
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
          Ghi chú phiếu thu
        </label>
        <textarea
          className="min-h-20 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          maxLength={1000}
          name="note"
          placeholder="Nhập ghi chú thu tiền (nếu có)…"
        />
      </div>

      {message ? (
        <div
          aria-live="polite"
          className={`flex items-center gap-2.5 rounded-2xl p-4 text-sm font-semibold ${
            message.includes('thành công')
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
          }`}
          role="status"
        >
          <span>{message}</span>
        </div>
      ) : null}

      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-4 font-bold text-white shadow-lg shadow-sky-600/20 transition-all hover:bg-sky-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
        disabled={isPending || unallocatedAmount < 0}
        type="submit"
      >
        {isPending ? 'Đang lưu phiếu thu…' : 'Lưu Phiếu Thu Tiền'}
      </button>
    </form>
  )
}
