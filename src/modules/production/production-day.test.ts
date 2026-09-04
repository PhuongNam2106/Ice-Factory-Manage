import { describe, expect, it } from 'vitest'
import {
  canStartMachine,
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

  it('builds the 20:00 to 18:00 Bangkok production window', () => {
    expect(getProductionWindow('2026-09-04')).toEqual({
      startsAt: new Date('2026-09-04T13:00:00.000Z'),
      endsAt: new Date('2026-09-05T11:00:00.000Z'),
    })
  })

  it('only allows a new run from 20:00 through before 18:00', () => {
    expect(canStartMachine(new Date('2026-09-05T10:59:59.000Z'))).toBe(true)
    expect(canStartMachine(new Date('2026-09-05T11:00:00.000Z'))).toBe(false)
    expect(canStartMachine(new Date('2026-09-05T12:59:59.000Z'))).toBe(false)
    expect(canStartMachine(new Date('2026-09-05T13:00:00.000Z'))).toBe(true)
  })

  it('rejects invalid dates and production date strings', () => {
    expect(() => getProductionDate(new Date(Number.NaN))).toThrow('Thời điểm không hợp lệ')
    expect(() => getProductionWindow('04/09/2026')).toThrow('Ngày sản xuất không hợp lệ')
  })
})
