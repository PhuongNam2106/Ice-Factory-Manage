import { describe, expect, it } from 'vitest'
import { normalizeActorFilter, sanitizeAuditData } from './repository'

describe('audit data sanitization', () => {
  it('redacts credentials recursively before rendering', () => {
    expect(sanitizeAuditData({ username: 'quanly', password: 'secret', nested: { access_token: 'token', pin: '123456' } })).toEqual({
      username: 'quanly', password: '[REDACTED]', nested: { access_token: '[REDACTED]', pin: '[REDACTED]' },
    })
  })

  it('accepts only UUID actor filters before querying Postgres', () => {
    expect(normalizeActorFilter('not-a-uuid')).toBeNull()
    expect(normalizeActorFilter('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
  })
})
