import { describe, expect, it } from 'vitest'
import {
  resolveSalesOperatingDay,
  shiftSalesOperatingDay,
} from './day-selection'

describe('sales operating day selection', () => {
  it('uses the current operating day when no day is selected', () => {
    expect(resolveSalesOperatingDay(undefined, '2026-09-11')).toBe('2026-09-11')
  })

  it('keeps a valid historical operating day', () => {
    expect(resolveSalesOperatingDay('2026-09-01', '2026-09-11')).toBe('2026-09-01')
  })

  it.each(['2026-09-12', '2026-02-30', '01/09/2026', ''])(
    'falls back to the current day for unavailable value %s',
    (selectedDay) => {
      expect(resolveSalesOperatingDay(selectedDay, '2026-09-11')).toBe('2026-09-11')
    },
  )

  it('moves across month and year boundaries', () => {
    expect(shiftSalesOperatingDay('2026-09-01', -1)).toBe('2026-08-31')
    expect(shiftSalesOperatingDay('2026-12-31', 1)).toBe('2027-01-01')
  })
})
