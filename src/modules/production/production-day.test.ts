import { describe, expect, it } from 'vitest'
import {
  getProductionDate,
  getProductionWindow,
} from './production-day'

describe('production day', () => {
  it('keeps the previous production date until 20:00 Bangkok time', () => {
    expect(getProductionDate(new Date('2026-09-05T10:59:59.000Z'))).toBe('2026-09-04')
    expect(getProductionDate(new Date('2026-09-05T11:00:00.000Z'))).toBe('2026-09-04')
    expect(getProductionDate(new Date('2026-09-05T12:59:59.000Z'))).toBe('2026-09-04')
    expect(getProductionDate(new Date('2026-09-05T13:00:00.000Z'))).toBe('2026-09-05')
  })

  it('builds the 20:00 to 20:00 Bangkok production window', () => {
    expect(getProductionWindow('2026-09-04')).toEqual({
      startsAt: new Date('2026-09-04T13:00:00.000Z'),
      endsAt: new Date('2026-09-05T13:00:00.000Z'),
    })
  })

  it('rejects invalid dates and production date strings', () => {
    expect(() => getProductionDate(new Date(Number.NaN))).toThrow('Thời điểm không hợp lệ')
    expect(() => getProductionWindow('04/09/2026')).toThrow('Ngày vận hành không hợp lệ')
  })
})
