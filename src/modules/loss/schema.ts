import Decimal from 'decimal.js'
import { z } from 'zod'
import type { DailyLossCalculation, DailyLossCalculationInput } from './types'

const bagCountSchema = z.coerce
  .number()
  .int('Số bao phải là số nguyên')
  .min(0, 'Số bao không được âm')
  .max(10_000_000, 'Số bao vượt giới hạn cho phép')

export const dailyLossInputSchema = z.object({
  operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
  openingBags: bagCountSchema.optional(),
  closingBags: bagCountSchema,
  note: z
    .string()
    .trim()
    .max(1000, 'Ghi chú không được vượt quá 1000 ký tự')
    .optional()
    .nullable()
    .transform((value) => value || null),
  expectedVersion: z.coerce.number().int().positive().optional().nullable(),
  idempotencyKey: z.string().uuid('Mã thao tác không hợp lệ'),
})

export const dailyLossDaySchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Ngày vận hành không hợp lệ',
)

export const confirmDailyLossWarningSchema = z.object({
  reportId: z.string().uuid('Báo cáo hao hụt không hợp lệ'),
  expectedVersion: z.coerce.number().int().positive('Phiên bản không hợp lệ'),
})

export type DailyLossInput = z.input<typeof dailyLossInputSchema>
export type DailyLoss = z.output<typeof dailyLossInputSchema>
export type ConfirmDailyLossWarningInput = z.input<typeof confirmDailyLossWarningSchema>
export type ConfirmDailyLossWarning = z.output<typeof confirmDailyLossWarningSchema>

export function calculateDailyLoss(
  input: DailyLossCalculationInput,
): DailyLossCalculation {
  const differenceBags =
    input.openingBags + input.producedBags - input.soldBags - input.closingBags
  const differencePct = input.producedBags === 0
    ? null
    : new Decimal(Math.abs(differenceBags))
        .div(input.producedBags)
        .times(100)
        .toDecimalPlaces(3)
        .toString()
  const classification = input.producedBags === 0
    ? 'no_production'
    : differenceBags > 0
      ? 'loss'
      : differenceBags < 0
        ? 'surplus'
        : 'matched'

  return {
    differenceBags,
    differencePct,
    classification,
    requiresReview: differencePct === null
      ? differenceBags !== 0
      : new Decimal(differencePct).greaterThan(input.warningPct),
  }
}
