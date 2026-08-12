import { describe, expect, it } from 'vitest'
import { getOperatingDay } from './operating-day'

describe('getOperatingDay', () => {
  it('uses Bangkok date at the UTC boundary', () => {
    expect(getOperatingDay(new Date('2026-08-11T17:30:00Z'))).toBe('2026-08-12')
  })

  it('rejects an invalid date', () => {
    expect(() => getOperatingDay(new Date('invalid'))).toThrow('Thời điểm không hợp lệ')
  })
})
