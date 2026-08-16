import { z } from 'zod'

export const cancellableEntityTypes = ['sale', 'receipt', 'production_batch', 'production_shift_total', 'expense'] as const

export const cancelDocumentSchema = z.object({
  entityType: z.enum(cancellableEntityTypes),
  entityId: z.uuid(),
  expectedVersion: z.int().positive(),
  reason: z.string().trim().min(5, 'Lý do hủy phải có ít nhất 5 ký tự.').max(500),
})

export type CancelDocumentInput = z.infer<typeof cancelDocumentSchema>

export function assertVersion(input: { expected: number; actual: number }) {
  if (input.expected !== input.actual) throw new Error('VERSION_CONFLICT')
}
