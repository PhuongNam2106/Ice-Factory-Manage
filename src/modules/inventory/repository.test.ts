import { describe, expect, it } from 'vitest'
import { normalizeStockCountRow } from './repository'

const row = {
  id: crypto.randomUUID(),
  operating_day: '2026-08-15',
  expected_bags: 100,
  actual_bags: 98,
  variance_bags: -2,
  variance_pct: 2,
  warning_pct: 5,
  requires_review: false,
  note: null,
  created_at: '2026-08-15T08:00:00.000Z',
}

describe('stock-count repository boundary', () => {
  it('rejects an impossible null generated variance instead of leaking it into the domain', () => {
    expect(() => normalizeStockCountRow({ ...row, variance_bags: null })).toThrow(
      'Dữ liệu kiểm kho không hợp lệ',
    )
  })

  it('maps a complete database row to the stock-count domain type', () => {
    expect(normalizeStockCountRow(row)).toMatchObject({
      expectedBags: 100,
      actualBags: 98,
      varianceBags: -2,
      requiresReview: false,
    })
  })
})
