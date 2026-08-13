'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import type { CustomerOption } from '@/modules/admin/catalog-service'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { createSale } from '@/modules/sales/actions'
import { SaleLineEditor, type SaleLineDraft } from './sale-line-editor'

const currency = new Intl.NumberFormat('vi-VN')

function emptyLine(): SaleLineDraft {
  return { id: crypto.randomUUID(), quantityBags: '', unitPriceVnd: '' }
}

export function WholesaleSaleForm({
  customers,
  operatingDay,
}: {
  customers: CustomerOption[]
  operatingDay: string
}) {
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
        kind: 'wholesale',
        operatingDay,
        customerId: String(formData.get('customerId') ?? '') || null,
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

      setMessage('Đã lưu giao dịch bán sỉ.')
      idempotencyKey.current = createIdempotencyKey()
      formRef.current?.reset()
      setLines([emptyLine()])
    })
  }

  return (
    <form action={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5" noValidate ref={formRef}>
      <label className="grid gap-1 text-sm font-medium">
        Khách hàng đầu mối
        <select className="min-h-12 rounded-lg border border-slate-300 px-3 py-2" defaultValue="" name="customerId">
          <option value="">Không chọn — chỉ dùng khi đã thu đủ</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}
        </select>
      </label>
      <SaleLineEditor lines={lines} onChange={setLines} />
      <p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold">Tạm tính: {currency.format(total)} đ</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Tiền nhận ngay<input className="min-h-12 rounded-lg border border-slate-300 px-3 py-2" defaultValue="0" inputMode="numeric" min="0" name="paidNowVnd" required type="number" /></label>
        <label className="grid gap-1 text-sm font-medium">Phương thức<select className="min-h-12 rounded-lg border border-slate-300 px-3 py-2" defaultValue="cash" name="paymentMethod"><option value="cash">Tiền mặt</option><option value="bank_transfer">Chuyển khoản</option></select></label>
      </div>
      <label className="grid gap-1 text-sm font-medium">Ghi chú<textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2" maxLength={1000} name="note" /></label>
      {message ? <p aria-live="polite" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status">{message}</p> : null}
      <button className="min-h-12 w-full rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">{isPending ? 'Đang lưu…' : 'Lưu bán sỉ'}</button>
    </form>
  )
}
