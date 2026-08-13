'use client'

import { useRef, useState, useTransition } from 'react'
import { createProductionBatch } from '@/modules/production/actions'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import type { MachineOption } from '@/modules/admin/catalog-service'

export function ProductionBatchForm({ machines, operatingDay }: { machines: MachineOption[]; operatingDay: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const key = useRef(createIdempotencyKey())
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const start = String(formData.get('startTime') ?? '')
      const end = String(formData.get('endTime') ?? '')
      const result = await createProductionBatch({
        operatingDay,
        shiftCode: String(formData.get('shiftCode')) as 'ca_sang' | 'ca_chieu' | 'ca_dem',
        machineId: String(formData.get('machineId')),
        startTime: new Date(`${operatingDay}T${start}:00+07:00`).toISOString(),
        endTime: new Date(`${operatingDay}T${end}:00+07:00`).toISOString(),
        goodBags: String(formData.get('goodBags') ?? ''),
        rejectedBags: String(formData.get('rejectedBags') ?? '0'),
        note: String(formData.get('note') ?? ''),
        idempotencyKey: key.current,
      })
      if (!result.ok) return setMessage(result.error.message)
      setMessage('Đã lưu mẻ sản xuất.')
      key.current = createIdempotencyKey()
      formRef.current?.reset()
    })
  }

  return (
    <form action={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" ref={formRef}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Máy sản xuất"><select className={control} name="machineId" required>{machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Ca"><ShiftSelect /></Field>
        <Field label="Bắt đầu"><input className={control} name="startTime" required type="time" /></Field>
        <Field label="Kết thúc"><input className={control} name="endTime" required type="time" /></Field>
        <Field label="Số bao đạt"><input className={control} inputMode="numeric" min="0" name="goodBags" required type="number" /></Field>
        <Field label="Số bao hỏng"><input className={control} defaultValue="0" inputMode="numeric" min="0" name="rejectedBags" required type="number" /></Field>
      </div>
      <Field label="Ghi chú"><textarea className={`${control} min-h-24`} maxLength={1000} name="note" /></Field>
      <Message message={message} />
      <button className={button} disabled={pending || machines.length === 0} type="submit">{pending ? 'Đang lưu…' : 'Lưu mẻ sản xuất'}</button>
    </form>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">{label}</span>{children}</label>
}
export function ShiftSelect() {
  return <select className={control} name="shiftCode"><option value="ca_sang">Ca sáng</option><option value="ca_chieu">Ca chiều</option><option value="ca_dem">Ca đêm</option></select>
}
export function Message({ message }: { message: string | null }) {
  return message ? <p aria-live="polite" className={`rounded-2xl p-3 text-sm font-semibold ${message.startsWith('Đã') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{message}</p> : null
}
export const control = 'min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
export const button = 'min-h-12 w-full rounded-2xl bg-sky-700 px-5 py-3 font-bold text-white shadow-lg shadow-sky-700/20 hover:bg-sky-800 disabled:opacity-50'
