export const control =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500/25 transition-all shadow-2xs'

export const button =
  'min-h-12 w-full rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800 shadow-2xs active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2'

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {label}
        </span>
        {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  )
}

export function Message({ message }: { message: string | null }) {
  return message ? (
    <p
      aria-live="polite"
      className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs font-semibold text-sky-900 sm:text-sm"
    >
      {message}
    </p>
  ) : null
}

