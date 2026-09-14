'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import type { CustomerOption } from '@/modules/admin/catalog-service'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { parseBangkokOccurredAt } from '@/modules/shared/occurred-at'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { createSale } from '@/modules/sales/actions'
import { OccurredAtField } from './occurred-at-field'

const currency = new Intl.NumberFormat('vi-VN')

type WholesaleSaleFormProps = {
  customers: CustomerOption[]
  canEnterHistoricalPrice: boolean
  currentOperatingDay: string
}

type FormMessage = {
  kind: 'success' | 'error'
  text: string
} | null

function isPositiveInteger(value: string) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0
}

function isPastOperatingDay(localOccurredAt: string | null, currentOperatingDay: string) {
  if (!localOccurredAt) return false

  try {
    const occurredAt = parseBangkokOccurredAt(localOccurredAt)
    return occurredAt !== null && getOperatingDay(new Date(occurredAt)) < currentOperatingDay
  } catch {
    return false
  }
}

export function WholesaleSaleForm({
  customers,
  canEnterHistoricalPrice,
  currentOperatingDay,
}: WholesaleSaleFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const idempotencyKey = useRef(createIdempotencyKey())
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [quantityBags, setQuantityBags] = useState('')
  const [selectedOccurredAt, setSelectedOccurredAt] = useState<string | null>(null)
  const [historicalUnitPriceVnd, setHistoricalUnitPriceVnd] = useState('')
  const [message, setMessage] = useState<FormMessage>(null)
  const [isPending, startTransition] = useTransition()

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  )
  const isHistoricalBackfill = canEnterHistoricalPrice
    && isPastOperatingDay(selectedOccurredAt, currentOperatingDay)
  const previewUnitPrice = isHistoricalBackfill && isPositiveInteger(historicalUnitPriceVnd)
    ? Number(historicalUnitPriceVnd)
    : selectedCustomer?.wholesaleUnitPriceVnd ?? null
  const total = isPositiveInteger(quantityBags) && previewUnitPrice !== null
    ? Number(quantityBags) * previewUnitPrice
    : 0
  const isSubmitDisabled = isPending
    || !selectedCustomer
    || !selectedCustomer.canCreateWholesaleSale
    || !isPositiveInteger(quantityBags)
    || (isHistoricalBackfill && !isPositiveInteger(historicalUnitPriceVnd))

  function submit(formData: FormData) {
    setMessage(null)
    let occurredAt: string | null
    try {
      occurredAt = parseBangkokOccurredAt(formData.get('occurredAt'))
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Thời gian phát sinh không hợp lệ',
      })
      return
    }

    const displayedUnitPrice = previewUnitPrice
    startTransition(async () => {
      const result = await createSale({
        kind: 'wholesale',
        occurredAt,
        customerId: selectedCustomerId,
        quantityBags: String(formData.get('quantityBags') ?? ''),
        historicalUnitPriceVnd: isHistoricalBackfill
          ? String(formData.get('historicalUnitPriceVnd') ?? '')
          : null,
        paidNowVnd: String(formData.get('paidNowVnd') ?? '0'),
        paymentMethod: formData.get('paymentMethod') === 'bank_transfer' ? 'bank_transfer' : 'cash',
        note: String(formData.get('note') ?? ''),
        idempotencyKey: idempotencyKey.current,
      })

      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error.message })
        return
      }

      const priceChanged = !isHistoricalBackfill
        && displayedUnitPrice !== null
        && displayedUnitPrice !== result.data.unitPriceVnd
      setMessage({
        kind: 'success',
        text: priceChanged
          ? `Đã lưu đơn bán sỉ ${currency.format(result.data.totalVnd)} VNĐ. Giá khách hàng vừa thay đổi; đơn đã được tính theo giá mới nhất.`
          : `Đã lưu thành công đơn bán sỉ ${currency.format(result.data.totalVnd)} VNĐ.`,
      })
      idempotencyKey.current = createIdempotencyKey()
      formRef.current?.reset()
      setSelectedCustomerId('')
      setQuantityBags('')
      setHistoricalUnitPriceVnd('')
    })
  }

  return (
    <form action={submit} className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs sm:p-8" noValidate ref={formRef}>
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="wholesale-customer">
          Khách hàng đầu mối
        </label>
        <select
          className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          id="wholesale-customer"
          name="customerId"
          onChange={(event) => setSelectedCustomerId(event.target.value)}
          required
          value={selectedCustomerId}
        >
          <option value="">Chọn khách hàng</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.phone ? ` · SĐT: ${customer.phone}` : ''}
              {!customer.canCreateWholesaleSale ? ' — Chưa thiết lập giá sỉ' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedCustomer ? (
        <div className={`rounded-2xl p-4 ring-1 ${
          selectedCustomer.canCreateWholesaleSale
            ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
            : 'bg-amber-50 text-amber-900 ring-amber-200'
        }`}>
          {selectedCustomer.wholesaleUnitPriceVnd !== null ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-wider">Giá sỉ hiện tại</span>
              <strong className="text-lg">{currency.format(selectedCustomer.wholesaleUnitPriceVnd)} VNĐ/bao</strong>
            </div>
          ) : (
            <p className="text-sm font-bold">Khách hàng chưa được thiết lập giá sỉ.</p>
          )}
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="wholesale-quantity">
          Số lượng bao
        </label>
        <input
          className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          id="wholesale-quantity"
          inputMode="numeric"
          min="1"
          name="quantityBags"
          onChange={(event) => setQuantityBags(event.target.value)}
          placeholder="Ví dụ: 10"
          required
          step="1"
          type="number"
          value={quantityBags}
        />
      </div>

      <OccurredAtField onValueChange={setSelectedOccurredAt} />

      {isHistoricalBackfill ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-amber-950" htmlFor="historical-wholesale-price">
            Giá sỉ thực tế mỗi bao
          </label>
          <input
            className="min-h-12 w-full rounded-2xl border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            id="historical-wholesale-price"
            inputMode="numeric"
            min="1"
            name="historicalUnitPriceVnd"
            onChange={(event) => setHistoricalUnitPriceVnd(event.target.value)}
            required
            step="1"
            type="number"
            value={historicalUnitPriceVnd}
          />
          <p className="mt-2 text-xs font-medium text-amber-800">
            Giá này chỉ áp dụng cho đơn nhập bù và không thay đổi giá mặc định của khách hàng.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl bg-sky-50/80 p-4 ring-1 ring-sky-200/60">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-900">Tổng giá trị dự kiến</span>
        <span className="text-xl font-extrabold text-sky-950">{currency.format(total)} VNĐ</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="wholesale-paid-now">
            Tiền nhận ngay (VNĐ)
          </label>
          <input
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            defaultValue="0"
            id="wholesale-paid-now"
            inputMode="numeric"
            min="0"
            name="paidNowVnd"
            required
            type="number"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="wholesale-payment-method">
            Phương thức thanh toán
          </label>
          <select
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            defaultValue="cash"
            id="wholesale-payment-method"
            name="paymentMethod"
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank_transfer">Chuyển khoản ngân hàng</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="wholesale-note">
          Ghi chú đơn hàng
        </label>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          id="wholesale-note"
          maxLength={1000}
          name="note"
          placeholder="Nhập thông tin giao hàng hoặc ghi chú khác (nếu có)…"
        />
      </div>

      {message ? (
        <div
          aria-live="polite"
          className={`rounded-2xl p-4 text-sm font-semibold ${
            message.kind === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
          }`}
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      <button
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm shadow-sky-700/20 transition-all hover:bg-sky-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        disabled={isSubmitDisabled}
        type="submit"
      >
        {isPending ? 'Đang lưu đơn hàng…' : 'Lưu Đơn Bán Sỉ'}
      </button>
    </form>
  )
}
