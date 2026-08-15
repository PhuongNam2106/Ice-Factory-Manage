import Decimal from 'decimal.js'
import { z } from 'zod'

type InventoryMovement = {
  direction: 1 | -1
  quantityBags: string | number
}

export function calculateBalance(movements: InventoryMovement[]): string {
  return movements
    .reduce(
      (balance, movement) =>
        balance.plus(new Decimal(movement.quantityBags).times(movement.direction)),
      new Decimal(0),
    )
    .toString()
}

export function calculateStockVariance(
  expectedBags: string | number,
  actualBags: string | number,
  warningPct: string | number,
) {
  const expected = new Decimal(expectedBags)
  const difference = new Decimal(actualBags).minus(expected)
  const pct = expected.isZero()
    ? difference.isZero()
      ? new Decimal(0)
      : null
    : difference.abs().dividedBy(expected.abs()).times(100).toDecimalPlaces(3)

  return {
    bags: difference.toString(),
    pct: pct?.toString() ?? null,
    requiresReview: pct === null ? !difference.isZero() : pct.greaterThan(warningPct),
  }
}

export const stockCountSchema = z.object({
  operatingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày vận hành không hợp lệ'),
  actualBags: z.coerce
    .number()
    .int('Số bao kiểm thực tế phải là số nguyên')
    .min(0, 'Số bao kiểm thực tế không được âm')
    .max(10_000_000, 'Số bao kiểm thực tế vượt giới hạn'),
  note: z
    .string()
    .trim()
    .max(1000, 'Ghi chú không được quá 1000 ký tự')
    .optional()
    .nullable()
    .transform((value) => value || null),
  idempotencyKey: z.string().uuid(),
})

export type StockCountInput = z.input<typeof stockCountSchema>
export type StockCount = z.output<typeof stockCountSchema>
