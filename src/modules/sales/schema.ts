import { z } from 'zod'

const quantityBagsSchema = z.coerce
  .number()
  .int('Số bao phải là số nguyên')
  .positive('Số bao phải lớn hơn 0')
  .max(10_000_000)

const vndSchema = z.coerce
  .number()
  .int('Số tiền phải là số nguyên')
  .min(0, 'Số tiền không được âm')
  .max(100_000_000_000_000)
  .refine(Number.isSafeInteger, 'Số tiền vượt quá giới hạn an toàn')

const unitPriceSchema = vndSchema.refine((value) => value > 0, 'Đơn giá phải lớn hơn 0')

export const saleLineSchema = z.object({
  quantityBags: quantityBagsSchema,
  unitPriceVnd: unitPriceSchema,
})

const commonSaleFields = {
  operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
  lines: z.array(saleLineSchema).min(1, 'Cần ít nhất một dòng bán hàng').max(50),
  paidNowVnd: vndSchema,
  paymentMethod: z.enum(['cash', 'bank_transfer']),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((value) => value || null),
  idempotencyKey: z.string().uuid(),
}

const wholesaleSaleSchema = z.object({
  ...commonSaleFields,
  kind: z.literal('wholesale'),
  customerId: z.string().uuid().optional().nullable(),
})

const retailSaleSchema = z.object({
  ...commonSaleFields,
  kind: z.literal('retail'),
  shiftCode: z
    .string()
    .trim()
    .min(1, 'Ca bán lẻ không được để trống')
    .max(30)
    .transform((value) => value.toUpperCase()),
})

export const createSaleSchema = z
  .discriminatedUnion('kind', [wholesaleSaleSchema, retailSaleSchema])
  .superRefine((sale, context) => {
    const totalVnd = sale.lines.reduce(
      (total, line) => total + line.quantityBags * line.unitPriceVnd,
      0,
    )

    if (!Number.isSafeInteger(totalVnd)) {
      context.addIssue({
        code: 'custom',
        path: ['lines'],
        message: 'Tổng tiền vượt quá giới hạn an toàn',
      })
      return
    }

    if (sale.paidNowVnd > totalVnd) {
      context.addIssue({
        code: 'custom',
        path: ['paidNowVnd'],
        message: 'Tiền nhận ngay không được vượt tổng tiền',
      })
    }

    if (sale.kind === 'wholesale' && sale.paidNowVnd < totalVnd && !sale.customerId) {
      context.addIssue({
        code: 'custom',
        path: ['customerId'],
        message: 'Khách hàng là bắt buộc khi còn công nợ',
      })
    }

    if (sale.kind === 'retail' && sale.paidNowVnd !== totalVnd) {
      context.addIssue({
        code: 'custom',
        path: ['paidNowVnd'],
        message: 'Bán lẻ phải thu đủ 100% tổng tiền',
      })
    }
  })

export type CreateSaleInput = z.input<typeof createSaleSchema>
export type CreateSale = z.output<typeof createSaleSchema>
export type CreateWholesaleSale = Extract<CreateSale, { kind: 'wholesale' }>
export type CreateRetailSale = Extract<CreateSale, { kind: 'retail' }>
