import { describe, expect, it } from 'vitest'
import type { SaleListItem } from './types'
import { summarizeSales } from './summary'

function sale(
  overrides: Partial<SaleListItem> & Pick<SaleListItem, 'id' | 'kind' | 'totalVnd'>,
): SaleListItem {
  return {
    operatingDay: '2026-09-01',
    customerName: null,
    shiftCode: null,
    paidNowVnd: overrides.totalVnd,
    status: 'active',
    version: 1,
    createdBy: '11111111-1111-4111-8111-111111111111',
    occurredAt: '2026-09-01T13:00:00.000Z',
    createdAt: '2026-09-01T13:00:00.000Z',
    ...overrides,
  }
}

describe('summarizeSales', () => {
  it('separates active wholesale and retail revenue', () => {
    const result = summarizeSales([
      sale({ id: 'wholesale', kind: 'wholesale', totalVnd: 140_000 }),
      sale({ id: 'retail', kind: 'retail', totalVnd: 70_000 }),
    ])

    expect(result).toEqual({
      totalTransactions: 2,
      activeTransactions: 2,
      cancelledTransactions: 0,
      wholesaleRevenueVnd: 140_000,
      retailRevenueVnd: 70_000,
      totalRevenueVnd: 210_000,
    })
  })

  it('keeps cancelled transactions visible but excludes them from revenue', () => {
    const result = summarizeSales([
      sale({ id: 'active', kind: 'wholesale', totalVnd: 140_000 }),
      sale({ id: 'cancelled', kind: 'retail', totalVnd: 70_000, status: 'cancelled' }),
    ])

    expect(result.totalTransactions).toBe(2)
    expect(result.activeTransactions).toBe(1)
    expect(result.cancelledTransactions).toBe(1)
    expect(result.retailRevenueVnd).toBe(0)
    expect(result.totalRevenueVnd).toBe(140_000)
  })
})
