import { describe, expect, it } from 'vitest'
import { getOperatingDay, getOperatingWindow } from './operating-day'

describe('operating day', () => {
  it('keeps times before 20:00 Bangkok in the previous operating day', () => {
    expect(getOperatingDay(new Date('2026-09-06T12:59:59.999Z'))).toBe('2026-09-05')
  })

  it('starts a new operating day at exactly 20:00 Bangkok', () => {
    expect(getOperatingDay(new Date('2026-09-06T13:00:00.000Z'))).toBe('2026-09-06')
  })

  it('builds a half-open 24-hour operating window', () => {
    expect(getOperatingWindow('2026-09-05')).toEqual({
      startsAt: new Date('2026-09-05T13:00:00.000Z'),
      endsAt: new Date('2026-09-06T13:00:00.000Z'),
    })
  })

  it('rejects an invalid date', () => {
    expect(() => getOperatingDay(new Date('invalid'))).toThrow('Thời điểm không hợp lệ')
    expect(() => getOperatingWindow('05/09/2026')).toThrow('Ngày vận hành không hợp lệ')
  })
})
