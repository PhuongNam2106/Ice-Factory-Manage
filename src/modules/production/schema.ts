import { z } from 'zod'
import Decimal from 'decimal.js'

export function resolveOfficialQuantity({
  source,
  batchGoodBags,
  shiftGoodBags,
}: {
  source: 'batches' | 'shift_total'
  batchGoodBags: string | number
  shiftGoodBags: string | number
}): string {
  return new Decimal(source === 'shift_total' ? shiftGoodBags : batchGoodBags).toString()
}

export function calculateProductionVariance(
  batchGoodBags: string | number,
  shiftGoodBags: string | number,
) {
  const batch = new Decimal(batchGoodBags)
  const shift = new Decimal(shiftGoodBags)
  const difference = shift.minus(batch)

  return {
    bags: difference.toString(),
    pct: batch.isZero()
      ? difference.isZero() ? '0' : null
      : difference.dividedBy(batch).times(100).toDecimalPlaces(3).toString(),
    hasDiscrepancy: !difference.isZero(),
  }
}

export const shiftCodeSchema = z.enum(['ca_sang', 'ca_chieu', 'ca_dem'])

export const productionBatchSchema = z
  .object({
    operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
    shiftCode: shiftCodeSchema,
    machineId: z.string().uuid('ID máy sản xuất không hợp lệ'),
    startTime: z.string().datetime({ message: 'Thời gian bắt đầu không hợp lệ' }),
    endTime: z.string().datetime({ message: 'Thời gian kết thúc không hợp lệ' }),
    goodBags: z.coerce
      .number()
      .int('Số bao đạt phải là số nguyên')
      .min(0, 'Số bao đạt không được âm'),
    rejectedBags: z.coerce
      .number()
      .int('Số bao hỏng phải là số nguyên')
      .min(0, 'Số bao hỏng không được âm')
      .default(0),
    note: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((val) => val || null),
    idempotencyKey: z.string().uuid(),
  })
  .refine(
    (data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      path: ['endTime'],
    },
  )

export const productionShiftTotalSchema = z.object({
  operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
  shiftCode: shiftCodeSchema,
  machineId: z.string().uuid('ID máy sản xuất không hợp lệ'),
  goodBags: z.coerce
    .number()
    .int('Số bao đạt phải là số nguyên')
    .min(0, 'Số bao đạt không được âm'),
  rejectedBags: z.coerce
    .number()
    .int('Số bao hỏng phải là số nguyên')
    .min(0, 'Số bao hỏng không được âm')
    .default(0),
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((val) => val || null),
  idempotencyKey: z.string().uuid(),
})

export const selectProductionSourceSchema = z.object({
  operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
  shiftCode: shiftCodeSchema,
  machineId: z.string().uuid('ID máy sản xuất không hợp lệ'),
  selectedSource: z.enum(['batches', 'shift_total']),
  idempotencyKey: z.string().uuid(),
})

export type ProductionBatchInput = z.input<typeof productionBatchSchema>
export type ProductionBatch = z.output<typeof productionBatchSchema>

export type ProductionShiftTotalInput = z.input<typeof productionShiftTotalSchema>
export type ProductionShiftTotal = z.output<typeof productionShiftTotalSchema>

export type SelectProductionSourceInput = z.input<typeof selectProductionSourceSchema>
export type SelectProductionSource = z.output<typeof selectProductionSourceSchema>
