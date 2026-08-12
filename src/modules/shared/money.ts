import { z } from 'zod'

const vndSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value), 'Số tiền phải là số nguyên')
  .transform(Number)
  .refine(Number.isSafeInteger, 'Số tiền vượt quá giới hạn an toàn')

export function toVnd(input: string): number {
  return vndSchema.parse(input)
}
