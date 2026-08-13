'use client'

export type SaleLineDraft = {
  id: string
  quantityBags: string
  unitPriceVnd: string
}

const currency = new Intl.NumberFormat('vi-VN')

export function SaleLineEditor({
  lines,
  onChange,
}: {
  lines: SaleLineDraft[]
  onChange: (lines: SaleLineDraft[]) => void
}) {
  function updateLine(id: string, field: 'quantityBags' | 'unitPriceVnd', value: string) {
    onChange(lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)))
  }

  function addLine() {
    onChange([...lines, { id: crypto.randomUUID(), quantityBags: '', unitPriceVnd: '' }])
  }

  function removeLine(id: string) {
    if (lines.length === 1) return
    onChange(lines.filter((line) => line.id !== id))
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        Chi tiết số bao & đơn giá
      </legend>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const subtotal = Number(line.quantityBags || 0) * Number(line.unitPriceVnd || 0)

          return (
            <div
              className="relative rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-slate-300"
              key={line.id}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Dòng #{index + 1}</span>
                {subtotal > 0 ? (
                  <span className="text-xs font-bold text-sky-700">
                    Thành tiền: {currency.format(subtotal)} đ
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  <span>Số bao</span>
                  <input
                    aria-label={`Số bao dòng ${index + 1}`}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => updateLine(line.id, 'quantityBags', event.target.value)}
                    placeholder="0"
                    required
                    type="number"
                    value={line.quantityBags}
                  />
                </label>

                <label className="grid gap-1 text-xs font-semibold text-slate-700">
                  <span>Đơn giá (VNĐ/bao)</span>
                  <input
                    aria-label={`Đơn giá dòng ${index + 1}`}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => updateLine(line.id, 'unitPriceVnd', event.target.value)}
                    placeholder="Ví dụ: 7000"
                    required
                    type="number"
                    value={line.unitPriceVnd}
                  />
                </label>

                <div className="pt-5">
                  <button
                    aria-label={`Xóa dòng ${index + 1}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={lines.length === 1}
                    onClick={() => removeLine(line.id)}
                    type="button"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 py-3 text-xs font-bold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100/60 active:scale-[0.99]"
        onClick={addLine}
        type="button"
      >
        <span>+ Thêm Mức Giá / Dòng Mặt Hàng</span>
      </button>
    </fieldset>
  )
}
