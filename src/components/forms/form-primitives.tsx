export const control = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
export const button = 'min-h-12 w-full rounded-xl bg-sky-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-bold text-slate-800">{label}</span>{children}</label>
}

export function Message({ message }: { message: string | null }) {
  return message ? <p aria-live="polite" className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-900">{message}</p> : null
}
