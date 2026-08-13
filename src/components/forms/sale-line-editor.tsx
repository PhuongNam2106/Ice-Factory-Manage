'use client'

export type SaleLineDraft = {
  id: string
  quantityBags: string
  unitPriceVnd: string
}

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
      <legend className="text-sm font-semibold text-slate-900">Số bao và đơn giá</legend>
      {lines.map((line, index) => (
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" key={line.id}>
          <label className="grid gap-1 text-sm font-medium">
            Số bao
            <input
              aria-label={`Số bao dòng ${index + 1}`}
              className="min-h-12 min-w-0 rounded-lg border border-slate-300 px-3 py-2"
              inputMode="numeric"
              min="1"
              onChange={(event) => updateLine(line.id, 'quantityBags', event.target.value)}
              required
              type="number"
              value={line.quantityBags}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Đơn giá/bao
            <input
              aria-label={`Đơn giá dòng ${index + 1}`}
              className="min-h-12 min-w-0 rounded-lg border border-slate-300 px-3 py-2"
              inputMode="numeric"
              min="1"
              onChange={(event) => updateLine(line.id, 'unitPriceVnd', event.target.value)}
              required
              type="number"
              value={line.unitPriceVnd}
            />
          </label>
          <button
            aria-label={`Xóa dòng ${index + 1}`}
            className="min-h-12 rounded-lg border border-slate-300 px-3 text-slate-700 disabled:opacity-40"
            disabled={lines.length === 1}
            onClick={() => removeLine(line.id)}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
      <button className="min-h-11 rounded-lg border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-800" onClick={addLine} type="button">
        + Thêm mức giá
      </button>
    </fieldset>
  )
}
