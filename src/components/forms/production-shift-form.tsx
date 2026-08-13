'use client'

import { useRef, useState, useTransition } from 'react'
import type { MachineOption } from '@/modules/admin/catalog-service'
import { createProductionShiftTotal } from '@/modules/production/actions'
import { createIdempotencyKey } from '@/modules/shared/idempotency'
import { button, control, Field, Message, ShiftSelect } from './production-batch-form'

export function ProductionShiftForm({ machines, operatingDay }: { machines: MachineOption[]; operatingDay: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const key = useRef(createIdempotencyKey())
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    setMessage(null)
    startTransition(async () => {
      const result = await createProductionShiftTotal({
        operatingDay,
        shiftCode: String(formData.get('shiftCode')) as 'ca_sang' | 'ca_chieu' | 'ca_dem',
        machineId: String(formData.get('machineId')),
        goodBags: String(formData.get('goodBags') ?? ''),
        rejectedBags: String(formData.get('rejectedBags') ?? '0'),
        note: String(formData.get('note') ?? ''),
        idempotencyKey: key.current,
      })
      if (!result.ok) return setMessage(result.error.message)
      setMessage('Đã lưu tổng cuối ca.')
      key.current = createIdempotencyKey()
      formRef.current?.reset()
    })
  }

  return (
    <form action={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" ref={formRef}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Máy sản xuất"><select className={control} name="machineId" required>{machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Ca"><ShiftSelect /></Field>
        <Field label="Tổng số bao đạt"><input className={control} inputMode="numeric" min="0" name="goodBags" required type="number" /></Field>
        <Field label="Tổng số bao hỏng"><input className={control} defaultValue="0" inputMode="numeric" min="0" name="rejectedBags" required type="number" /></Field>
      </div>
      <Field label="Ghi chú"><textarea className={`${control} min-h-24`} maxLength={1000} name="note" /></Field>
      <Message message={message} />
      <button className={button} disabled={pending || machines.length === 0} type="submit">{pending ? 'Đang lưu…' : 'Lưu tổng cuối ca'}</button>
    </form>
  )
}
