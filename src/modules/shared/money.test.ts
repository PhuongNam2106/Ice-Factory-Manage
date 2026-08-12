import { describe, expect, it } from 'vitest'
import { toVnd } from './money'

describe('toVnd', () => {
  it('keeps VND as an integer', () => {
    expect(toVnd('12000')).toBe(12000)
    expect(() => toVnd('12000.50')).toThrow('Số tiền phải là số nguyên')
  })

  it('rejects unsafe and negative amounts', () => {
    expect(() => toVnd('-1')).toThrow()
    expect(() => toVnd('9007199254740992')).toThrow()
  })
})
