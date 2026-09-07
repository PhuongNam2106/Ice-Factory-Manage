import { describe, expect, it } from 'vitest'
import { parseBangkokOccurredAt } from './occurred-at'

describe('parseBangkokOccurredAt', () => {
  it('uses server current time when the optional field is empty', () => {
    expect(parseBangkokOccurredAt('')).toBeNull()
    expect(parseBangkokOccurredAt(null)).toBeNull()
  })

  it('converts a Bangkok datetime-local value to UTC ISO', () => {
    expect(parseBangkokOccurredAt('2026-09-06T19:50')).toBe('2026-09-06T12:50:00.000Z')
  })

  it('rejects an invalid local timestamp', () => {
    expect(() => parseBangkokOccurredAt('06/09/2026 19:50')).toThrow('Thời gian phát sinh không hợp lệ')
    expect(() => parseBangkokOccurredAt('2026-02-30T19:50')).toThrow('Thời gian phát sinh không hợp lệ')
  })
})
