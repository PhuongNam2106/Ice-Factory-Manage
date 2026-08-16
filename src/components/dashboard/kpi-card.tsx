export function KpiCard({ label, value, note, tone = 'plain' }: { label: string; value: string; note?: string; tone?: 'plain' | 'dark' | 'good' | 'warn' }) {
  const tones = { plain: 'border-slate-200 bg-white text-slate-950', dark: 'border-slate-950 bg-slate-950 text-white', good: 'border-emerald-200 bg-emerald-50 text-emerald-950', warn: 'border-amber-200 bg-amber-50 text-amber-950' }
  return <article className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${tones[tone]}`}><p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p><p className="mt-2 break-words text-2xl font-black tabular-nums tracking-tight sm:text-3xl">{value}</p>{note ? <p className="mt-1 break-words text-xs opacity-70">{note}</p> : null}</article>
}
