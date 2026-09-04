import { describe, expect, it } from 'vitest'
import {
  getRunOvertimeLevel,
  isHarvestReminderDue,
} from './presentation'

describe('production presentation rules', () => {
  it('starts the harvest reminder at the configured minute without blocking early entry', () => {
    const harvestedAt = new Date('2026-09-04T15:00:00.000Z')

    expect(isHarvestReminderDue(harvestedAt, new Date('2026-09-04T15:29:59.999Z'), 30)).toBe(false)
    expect(isHarvestReminderDue(harvestedAt, new Date('2026-09-04T15:30:00.000Z'), 30)).toBe(true)
  })

  it('escalates a run after the nominal end and again at the next 20:00', () => {
    const endsAt = new Date('2026-09-05T11:00:00.000Z')

    expect(getRunOvertimeLevel(new Date('2026-09-05T10:59:59.999Z'), endsAt)).toBe('none')
    expect(getRunOvertimeLevel(new Date('2026-09-05T11:00:00.000Z'), endsAt)).toBe('warning')
    expect(getRunOvertimeLevel(new Date('2026-09-05T12:59:59.999Z'), endsAt)).toBe('warning')
    expect(getRunOvertimeLevel(new Date('2026-09-05T13:00:00.000Z'), endsAt)).toBe('critical')
  })

  it('rejects invalid reminder configuration', () => {
    expect(() => isHarvestReminderDue(new Date(), new Date(), 0)).toThrow('Ngưỡng nhắc không hợp lệ')
  })
})
