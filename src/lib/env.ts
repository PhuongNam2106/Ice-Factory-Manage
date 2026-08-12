import { z } from 'zod'

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  APP_TIME_ZONE: z.literal('Asia/Bangkok').default('Asia/Bangkok'),
})

const schema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export function parsePublicEnv(input: Record<string, string | undefined>) {
  return publicSchema.parse(input)
}

export function parseEnv(input: Record<string, string | undefined>) {
  return schema.parse(input)
}

export type AppEnv = z.infer<typeof schema>
export type PublicAppEnv = z.infer<typeof publicSchema>

export function getPublicEnv(): PublicAppEnv {
  return parsePublicEnv(process.env)
}

export function getEnv(): AppEnv {
  return parseEnv(process.env)
}
