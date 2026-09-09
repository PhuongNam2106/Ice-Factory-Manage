'use client'

import { useState, useTransition } from 'react'
import { saveCustomer, setCustomerActive } from '@/modules/admin/catalog-actions'
import type { CustomerRecord } from '@/modules/admin/catalog-service'

const currency = new Intl.NumberFormat('vi-VN')

export function CustomerForm({ customer }: { customer?: CustomerRecord }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await saveCustomer({
        id: customer?.id,
        name: String(formData.get('name') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        address: String(formData.get('address') ?? ''),
        paymentTermDays: String(formData.get('paymentTermDays') ?? '0'),
        wholesaleUnitPriceVnd: String(formData.get('wholesaleUnitPriceVnd') ?? ''),
      })
      setMessage(result.ok ? 'Đã lưu khách hàng.' : result.error.message)
    })
  }

  function changeActive() {
    if (!customer) return
    setMessage(null)
    startTransition(async () => {
      const result = await setCustomerActive({ id: customer.id, isActive: !customer.isActive })
      setMessage(result.ok ? 'Đã cập nhật trạng thái khách hàng.' : result.error.message)
    })
  }

  return (
    <form action={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold">{customer ? customer.name : 'Thêm khách hàng đầu mối'}</h2>
        {customer ? <p className="mt-1 text-sm text-slate-600">{customer.isActive ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}</p> : null}
        {customer ? (
          customer.wholesaleUnitPriceVnd === null ? (
            <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
              Chưa thiết lập giá sỉ
            </p>
          ) : (
            <p className="mt-2 text-sm font-bold text-sky-800">
              {currency.format(customer.wholesaleUnitPriceVnd)} VNĐ/bao
            </p>
          )
        ) : null}
      </div>
      <label className="grid gap-1 text-sm font-medium">Tên khách hàng<input className="min-h-11 rounded-lg border border-slate-300 px-3 py-2" defaultValue={customer?.name} name="name" required /></label>
      <label className="grid gap-1 text-sm font-medium">Số điện thoại<input className="min-h-11 rounded-lg border border-slate-300 px-3 py-2" defaultValue={customer?.phone ?? ''} inputMode="tel" name="phone" type="tel" /></label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">Địa chỉ<input className="min-h-11 rounded-lg border border-slate-300 px-3 py-2" defaultValue={customer?.address ?? ''} name="address" /></label>
      <label className="grid gap-1 text-sm font-medium">Thời hạn công nợ (ngày)<input className="min-h-11 rounded-lg border border-slate-300 px-3 py-2" defaultValue={customer?.paymentTermDays ?? 0} inputMode="numeric" min="0" name="paymentTermDays" required type="number" /></label>
      <label className="grid gap-1 text-sm font-medium">
        Giá sỉ mỗi bao (VNĐ)
        <input
          className="min-h-11 rounded-lg border border-slate-300 px-3 py-2"
          defaultValue={customer?.wholesaleUnitPriceVnd ?? ''}
          inputMode="numeric"
          min="1"
          name="wholesaleUnitPriceVnd"
          required
          step="1"
          type="number"
        />
      </label>
      {customer ? (
        <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 sm:col-span-2">
          Giá mới chỉ áp dụng cho các đơn tạo sau khi lưu.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2 sm:justify-end">
        <button className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">{customer ? 'Lưu thay đổi' : 'Thêm khách hàng'}</button>
        {customer ? <button className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-60" disabled={isPending} onClick={changeActive} type="button">{customer.isActive ? 'Ngừng hoạt động' : 'Kích hoạt lại'}</button> : null}
      </div>
      {message ? <p aria-live="polite" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 sm:col-span-2" role="status">{message}</p> : null}
    </form>
  )
}
