import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null)

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: optionalText(30),
  address: optionalText(300),
  paymentTermDays: z.coerce.number().int().min(0).max(3650),
})

export const machineSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: optionalText(50),
})

export const catalogIdSchema = z.string().uuid()

export const customerMutationSchema = customerSchema.extend({
  id: catalogIdSchema.optional(),
})

export const machineMutationSchema = machineSchema.extend({
  id: catalogIdSchema.optional(),
})

export const catalogActiveSchema = z.object({
  id: catalogIdSchema,
  isActive: z.boolean(),
})

export type CustomerMutationInput = z.input<typeof customerMutationSchema>
export type MachineMutationInput = z.input<typeof machineMutationSchema>
