import { describe, expect, it } from 'vitest'
import { assertVersion, cancelDocumentSchema } from './version-conflict'

describe('optimistic concurrency and cancellation input', () => {
  it('rejects a stale edit', () => {
    expect(() => assertVersion({ expected: 2, actual: 3 })).toThrow('VERSION_CONFLICT')
  })

  it('accepts the current version', () => {
    expect(() => assertVersion({ expected: 3, actual: 3 })).not.toThrow()
  })

  it('requires a meaningful cancellation reason', () => {
    expect(() => cancelDocumentSchema.parse({ entityType: 'sale', entityId: crypto.randomUUID(), expectedVersion: 1, reason: ' ' })).toThrow()
  })
})
