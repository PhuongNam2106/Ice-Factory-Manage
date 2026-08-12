import Decimal from 'decimal.js'
import { z } from 'zod'

const bagQuantitySchema = z
  .string()
  .trim()
  .refine((value) => /^\d+(?:\.\d{1,3})?$/.test(value), {
    message: 'Số bao phải không âm và có tối đa 3 chữ số thập phân',
  })
  .transform((value) => new Decimal(value).toString())

export function toBagQuantity(input: string): string {
  return bagQuantitySchema.parse(input)
}
