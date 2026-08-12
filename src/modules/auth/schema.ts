import { z } from 'zod'

const vietnamesePhonePattern = /^\+84[35789]\d{8}$/

export function normalizeVietnamesePhone(phone: string) {
  const compact = phone.trim().replace(/[\s().-]/g, '')

  if (compact.startsWith('+84')) {
    return compact
  }

  if (compact.startsWith('84')) {
    return `+${compact}`
  }

  if (compact.startsWith('0')) {
    return `+84${compact.slice(1)}`
  }

  return compact
}

export const loginSchema = z.object({
  phone: z
    .string()
    .transform(normalizeVietnamesePhone)
    .refine((phone) => vietnamesePhonePattern.test(phone), {
      message: 'Số điện thoại Việt Nam không hợp lệ',
    }),
  pin: z.string().regex(/^\d{6,}$/, 'Mã PIN phải có ít nhất 6 chữ số'),
})

export const userIdSchema = z.string().uuid()

export const userCreateSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['employee', 'manager']).default('employee'),
})

export const userPinResetSchema = z.object({
  userId: userIdSchema,
  pin: z.string().regex(/^\d{6,}$/, 'Mã PIN phải có ít nhất 6 chữ số'),
})

export const userActiveSchema = z.object({
  userId: userIdSchema,
  isActive: z.boolean(),
})
