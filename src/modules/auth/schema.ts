import { z } from 'zod'

const vietnamesePhonePattern = /^\+84[35789]\d{8}$/
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/

const numericPasswordSchema = z
  .string()
  .regex(/^\d{6,}$/, 'Mật khẩu phải có ít nhất 6 chữ số')

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@account.icefactory.invalid`
}

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

const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .refine((username) => usernamePattern.test(username), {
    message: 'Tên tài khoản không hợp lệ',
  })

const optionalPhoneSchema = z
  .preprocess((value) => value ?? '', z.string())
  .transform((phone) => phone.trim())
  .transform((phone) => phone === '' ? null : normalizeVietnamesePhone(phone))
  .refine((phone) => phone === null || vietnamesePhonePattern.test(phone), {
    message: 'Số điện thoại Việt Nam không hợp lệ',
  })

export const loginSchema = z.object({
  username: usernameSchema,
  password: numericPasswordSchema,
})

export const userIdSchema = z.string().uuid()

export const userCreateSchema = z.object({
  username: usernameSchema,
  phone: optionalPhoneSchema,
  password: numericPasswordSchema,
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['employee', 'manager']).default('employee'),
})

export const userPasswordResetSchema = z.object({
  userId: userIdSchema,
  password: numericPasswordSchema,
})

export const userActiveSchema = z.object({
  userId: userIdSchema,
  isActive: z.boolean(),
})
