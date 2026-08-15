import { z } from 'zod'

const operatingDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ')

export const createExpenseSchema = z.object({
  operatingDay: operatingDaySchema,
  categoryId: z.string().uuid('Loại chi phí không hợp lệ'),
  amountVnd: z.coerce
    .number()
    .int('Số tiền phải là số nguyên đồng')
    .positive('Số tiền phải lớn hơn 0')
    .max(10_000_000_000, 'Số tiền vượt giới hạn cho phép'),
  payee: z.string().trim().min(1, 'Vui lòng nhập người nhận').max(200),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((value) => value || null),
  idempotencyKey: z.string().uuid(),
})

export const reviewExpenseSchema = z
  .object({
    expenseId: z.string().uuid(),
    decision: z.enum(['approved', 'rejected']),
    reason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.decision === 'rejected' && !value.reason) {
      context.addIssue({
        code: 'custom',
        message: 'Cần nhập lý do từ chối',
        path: ['reason'],
      })
    }
  })

export const attachmentMetadataSchema = z.object({
  expenseId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024),
})

export function sumApprovedExpenses(
  expenses: Array<{ amountVnd: number; status: 'pending' | 'approved' | 'rejected' }>,
) {
  return expenses.reduce(
    (total, expense) => total + (expense.status === 'approved' ? expense.amountVnd : 0),
    0,
  )
}

export type CreateExpenseInput = z.input<typeof createExpenseSchema>
export type CreateExpense = z.output<typeof createExpenseSchema>
export type ReviewExpenseInput = z.input<typeof reviewExpenseSchema>
export type ReviewExpense = z.output<typeof reviewExpenseSchema>
export type AttachmentMetadataInput = z.input<typeof attachmentMetadataSchema>
export type AttachmentMetadata = z.output<typeof attachmentMetadataSchema>
