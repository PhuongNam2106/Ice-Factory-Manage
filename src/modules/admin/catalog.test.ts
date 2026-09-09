import { describe, expect, it, vi } from 'vitest'
import { listActiveCustomers, listCustomers } from './catalog-service'
import { customerSchema, machineSchema } from './catalog-schema'

function customerClient(rows: unknown[]) {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.order
    .mockReturnValueOnce(query)
    .mockResolvedValueOnce({ data: rows, error: null })

  return { from: vi.fn().mockReturnValue(query) } as never
}

describe('customerSchema', () => {
  it('requires a named wholesale customer', () => {
    expect(() => customerSchema.parse({
      name: ' ',
      paymentTermDays: 7,
      wholesaleUnitPriceVnd: 7000,
    })).toThrow()
  })

  it('does not allow a negative payment term', () => {
    expect(() => customerSchema.parse({
      name: 'Đầu mối A',
      paymentTermDays: -1,
      wholesaleUnitPriceVnd: 7000,
    })).toThrow()
  })

  it('requires a positive integer wholesale price', () => {
    for (const wholesaleUnitPriceVnd of ['', 0, -1, 7000.5]) {
      expect(() => customerSchema.parse({
        name: 'Đầu mối A',
        paymentTermDays: 7,
        wholesaleUnitPriceVnd,
      })).toThrow()
    }
  })

  it('normalizes a valid wholesale price', () => {
    expect(customerSchema.parse({
      name: 'Đầu mối A',
      paymentTermDays: 7,
      wholesaleUnitPriceVnd: '7000',
    }).wholesaleUnitPriceVnd).toBe(7000)
  })

  it('normalizes optional contact fields', () => {
    expect(
      customerSchema.parse({
        name: ' Đầu mối A ',
        phone: ' ',
        address: ' Chợ trung tâm ',
        paymentTermDays: 7,
        wholesaleUnitPriceVnd: 7000,
      }),
    ).toEqual({
      name: 'Đầu mối A',
      phone: null,
      address: 'Chợ trung tâm',
      paymentTermDays: 7,
      wholesaleUnitPriceVnd: 7000,
    })
  })
})

describe('machineSchema', () => {
  it('requires a machine name and normalizes an optional code', () => {
    expect(() => machineSchema.parse({ name: ' ', code: 'M1' })).toThrow()
    expect(machineSchema.parse({ name: ' Máy 1 ', code: ' ' })).toEqual({
      name: 'Máy 1',
      code: null,
    })
  })
})

describe('customer catalog mapping', () => {
  const rows = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Đầu mối có giá',
      phone: null,
      address: null,
      payment_term_days: 7,
      wholesale_unit_price_vnd: 7000,
      is_active: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Đầu mối chưa có giá',
      phone: null,
      address: null,
      payment_term_days: 0,
      wholesale_unit_price_vnd: null,
      is_active: true,
    },
  ]

  it('maps the wholesale price and eligibility', async () => {
    await expect(listCustomers(customerClient(rows))).resolves.toMatchObject([
      { wholesaleUnitPriceVnd: 7000, canCreateWholesaleSale: true },
      { wholesaleUnitPriceVnd: null, canCreateWholesaleSale: false },
    ])
  })

  it('keeps active customers without prices so the UI can explain the problem', async () => {
    const customers = await listActiveCustomers(customerClient(rows))

    expect(customers).toHaveLength(2)
    expect(customers[1]).toMatchObject({
      name: 'Đầu mối chưa có giá',
      canCreateWholesaleSale: false,
    })
  })
})
