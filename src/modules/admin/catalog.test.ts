import { describe, expect, it } from 'vitest'
import { customerSchema, machineSchema } from './catalog-schema'

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
