'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { createSale } from '@/modules/sales/actions'
import { SaleLineEditor, type SaleLineDraft } from './sale-line-editor'

const currency = new Intl.NumberFormat('vi-VN')

function emptyLine(): SaleLineDraft {
  return { id: crypto.randomUUID(), quantityBags: '', unitPriceVnd: '' }
}

export function RetailSaleForm({ operatingDay }: { operatingDay: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const idempotencyKey = useRef(createIdempotencyKey())
  const [lines, setLines] = useState<SaleLineDraft[]>([emptyLine()])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.quantityBags || 0) * Number(line.unitPriceVnd || 0), 0),
    [lines],
  )

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await createSale({
        kind: 'retail',
        operatingDay,
        shiftCode: String(formData.get('shiftCode') ?? ''),
        lines: lines.map(({ quantityBags, unitPriceVnd }) => ({ quantityBags, unitPriceVnd })),
        paidNowVnd: String(formData.get('paidNowVnd') ?? '0'),
        paymentMethod: formData.get('paymentMethod') === 'bank_transfer' ? 'bank_transfer' : 'cash',
        note: String(formData.get('note') ?? ''),
        idempotencyKey: idempotencyKey.current,
      })

      if (!result.ok) {
        setMessage(result.error.message)
        return
      }

      setMessage('Đã lưu thành công tổng hợp bán lẻ!')
      idempotencyKey.current = createIdempotencyKey()
      formRef.current?.reset()
      setLines([emptyLine()])
    })
  }

  return (
    <form action={submit} className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs sm:p-8" noValidate ref={formRef}>
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="retail-shift-code">
          Mã ca / Phiên bán lẻ
        </label>
        <input
          id="retail-shift-code"
          className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          defaultValue="DAY"
          maxLength={30}
          name="shiftCode"
          placeholder="Mã ca (ví dụ: CA1, DAY, NIGHT)"
          required
        />
      </div>

      <SaleLineEditor lines={lines} onChange={setLines} />

      {/* Calculated Total Bar */}
      <div className="flex items-center justify-between rounded-2xl bg-emerald-50/80 p-4 ring-1 ring-emerald-200/60">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Tổng Doanh Thu Ca Bán Lẻ</span>
        <span className="text-xl font-extrabold text-emerald-950">{currency.format(total)} VNĐ</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="retail-paid-now">
            Tổng tiền đã thu (Thu đủ 100%)
          </label>
          <input
            id="retail-paid-now"
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            defaultValue="0"
            inputMode="numeric"
            min="0"
            name="paidNowVnd"
            required
            type="number"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="retail-payment-method">
            Phương thức nhận tiền
          </label>
          <select
            id="retail-payment-method"
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            defaultValue="cash"
            name="paymentMethod"
          >
            <option value="cash">💵 Tiền mặt</option>
            <option value="bank_transfer">🏦 Chuyển khoản ngân hàng</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="retail-note">
          Ghi chú ca bán lẻ
        </label>
        <textarea
          id="retail-note"
          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          maxLength={1000}
          name="note"
          placeholder="Nhập ghi chú hoặc thông tin giao ca (nếu có)…"
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
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Đang lưu tổng hợp ca…' : 'Lưu Bán Lẻ Ca'}
      </button>
    </form>
  )
}
