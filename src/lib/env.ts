import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_TIME_ZONE: z.literal('Asia/Bangkok').default('Asia/Bangkok'),
})

export function parseEnv(input: Record<string, string | undefined>) {
  return schema.parse(input)
}

export type AppEnv = z.infer<typeof schema>

export function getEnv(): AppEnv {
  return parseEnv(process.env)
}

