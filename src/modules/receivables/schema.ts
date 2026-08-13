import { z } from 'zod'

const vndSchema = z.coerce
  .number()
  .int('Số tiền phải là số nguyên')
  .min(0, 'Số tiền không được âm')
  .max(100_000_000_000_000)
  .refine(Number.isSafeInteger, 'Số tiền vượt quá giới hạn an toàn')

const positiveVndSchema = vndSchema.refine((val) => val > 0, 'Số tiền phải lớn hơn 0')

export const receiptAllocationSchema = z.object({
  receivableId: z.string().uuid('ID khoản nợ không hợp lệ'),
  amountVnd: positiveVndSchema,
})

export const recordReceiptSchema = z
  .object({
    customerId: z.string().uuid('ID khách hàng không hợp lệ'),
    operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
    amountVnd: positiveVndSchema,
    paymentMethod: z.enum(['cash', 'bank_transfer']),
    note: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((val) => val || null),
    allocations: z.array(receiptAllocationSchema).default([]),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((data, ctx) => {
    const totalAllocated = data.allocations.reduce((sum, item) => sum + item.amountVnd, 0)

    if (!Number.isSafeInteger(totalAllocated)) {
      ctx.addIssue({
        code: 'custom',
        path: ['allocations'],
        message: 'Tổng số tiền phân bổ vượt quá giới hạn an toàn',
      })
      return
    }

    if (totalAllocated > data.amountVnd) {
      ctx.addIssue({
        code: 'custom',
        path: ['allocations'],
        message: 'Tổng số tiền phân bổ không được vượt quá số tiền phiếu thu',
      })
    }

    const seenReceivables = new Set<string>()
    for (const alloc of data.allocations) {
      if (seenReceivables.has(alloc.receivableId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['allocations'],
          message: 'Lặp lại khoản nợ trong danh sách phân bổ',
        })
        break
      }
      seenReceivables.add(alloc.receivableId)
    }
  })

export type RecordReceiptInput = z.input<typeof recordReceiptSchema>
export type RecordReceipt = z.output<typeof recordReceiptSchema>
