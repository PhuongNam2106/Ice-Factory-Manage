import { loginSchema } from '@/modules/auth/schema'

export function parseHealthCredentials(input: unknown) {
  const parsed = loginSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}
