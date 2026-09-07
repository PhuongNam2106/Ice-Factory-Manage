import { describe, expect, it } from 'vitest'
import { createExpenseSchema } from './schema'

describe('createExpenseSchema', () => {
  it('accepts fast entry without a client-selected operating day', () => {
    const expense = createExpenseSchema.parse({
      categoryId: crypto.randomUUID(),
      amountVnd: 150000,
      payee: 'Điện lực',
      note: '',
      occurredAt: null,
      idempotencyKey: crypto.randomUUID(),
    })

    expect(expense.occurredAt).toBeNull()
    expect(expense).not.toHaveProperty('operatingDay')
  })

  it('rejects a malformed actual occurrence timestamp', () => {
    expect(() => createExpenseSchema.parse({
      categoryId: crypto.randomUUID(),
      amountVnd: 150000,
      payee: 'Điện lực',
      occurredAt: '06/09/2026 19:50',
      idempotencyKey: crypto.randomUUID(),
    })).toThrow()
  })
})
