'use client'

import { useId, useState } from 'react'

export function OccurredAtField() {
  const [useCurrentTime, setUseCurrentTime] = useState(true)
  const id = useId()

  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-slate-800" htmlFor={`${id}-current`}>
        <input
          checked={useCurrentTime}
          className="size-5 accent-sky-700"
          id={`${id}-current`}
          onChange={(event) => setUseCurrentTime(event.target.checked)}
          type="checkbox"
        />
        Dùng giờ hiện tại
      </label>
      {!useCurrentTime ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor={`${id}-actual`}>
            Thời gian thực tế
          </label>
          <input
            className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            id={`${id}-actual`}
            name="occurredAt"
            required
            type="datetime-local"
          />
        </div>
      ) : null}
    </fieldset>
  )
}
