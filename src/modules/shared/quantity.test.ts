import { describe, expect, it } from 'vitest'
import { toBagQuantity } from './quantity'

describe('toBagQuantity', () => {
  it('allows at most three bag decimals', () => {
    expect(toBagQuantity('1.125')).toBe('1.125')
    expect(() => toBagQuantity('-1')).toThrow()
    expect(() => toBagQuantity('1.0001')).toThrow()
  })

  it('normalizes quantities without using floating-point arithmetic', () => {
    expect(toBagQuantity('001.100')).toBe('1.1')
    expect(toBagQuantity('0')).toBe('0')
  })
})
