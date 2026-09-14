import { describe, expect, it, vi } from 'vitest'
import { createSaleWithClient } from './service'

const wholesaleInput = {
  kind: 'wholesale' as const,
  occurredAt: null,
  customerId: '11111111-1111-4111-8111-111111111111',
  quantityBags: 10,
  historicalUnitPriceVnd: null,
  paidNowVnd: 0,
  paymentMethod: 'cash' as const,
  note: '',
  idempotencyKey: '22222222-2222-4222-8222-222222222222',
}

describe('createSaleWithClient', () => {
  it('parses the database-authoritative wholesale price and total', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        saleId: '33333333-3333-4333-8333-333333333333',
        kind: 'wholesale',
        unitPriceVnd: 7500,
        totalVnd: 75000,
        usedHistoricalPrice: false,
      },
      error: null,
    })

    const result = await createSaleWithClient(wholesaleInput, { rpc } as never)

    expect(result).toMatchObject({
      ok: true,
      data: {
        kind: 'wholesale',
        unitPriceVnd: 7500,
        totalVnd: 75000,
        usedHistoricalPrice: false,
      },
    })
  })

  it.each([
    ['WHOLESALE_CUSTOMER_REQUIRED', 'WHOLESALE_CUSTOMER_REQUIRED', 'Khách hàng là bắt buộc'],
    ['CUSTOMER_WHOLESALE_PRICE_MISSING', 'CUSTOMER_WHOLESALE_PRICE_MISSING', 'chưa được thiết lập giá sỉ'],
    ['INVALID_WHOLESALE_PRICE', 'INVALID_WHOLESALE_PRICE', 'Giá sỉ không hợp lệ'],
    ['HISTORICAL_WHOLESALE_PRICE_REQUIRED', 'HISTORICAL_WHOLESALE_PRICE_REQUIRED', 'Giá sỉ thực tế'],
    ['HISTORICAL_WHOLESALE_PRICE_FORBIDDEN', 'HISTORICAL_WHOLESALE_PRICE_FORBIDDEN', 'Chỉ quản lý'],
    ['HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED', 'HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED', 'chỉ được dùng khi nhập bù ngày cũ'],
    ['PAID_AMOUNT_EXCEEDS_TOTAL', 'PAID_AMOUNT_EXCEEDS_TOTAL', 'vượt tổng tiền'],
  ])('maps %s to an explanatory error', async (databaseError, expectedCode, expectedText) => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: databaseError },
    })

    const result = await createSaleWithClient(wholesaleInput, { rpc } as never)

    expect(result).toMatchObject({ ok: false, error: { code: expectedCode } })
    if (!result.ok) expect(result.error.message).toContain(expectedText)
  })
})
