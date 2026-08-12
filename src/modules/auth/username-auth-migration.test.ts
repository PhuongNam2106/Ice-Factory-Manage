import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260812171500_username_password_auth.sql',
)
const seedPath = resolve(process.cwd(), 'supabase/seed.sql')
const tokenNormalizationMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260812175500_normalize_auth_user_tokens.sql',
)

describe('username/password auth migration', () => {
  it('lets the generated identity email derive from identity_data', () => {
    const migration = readFileSync(migrationPath, 'utf8')
    const identityUpdate = migration.match(
      /update auth\.identities[\s\S]*?where user_id = [\s\S]*?;/,
    )?.[0]

    expect(identityUpdate).toBeDefined()
    expect(identityUpdate).toContain("'email', 'quanly@account.icefactory.invalid'")
    expect(identityUpdate).not.toMatch(/\n\s*email\s*=/)
  })

  it('seeds Auth rows in the format expected by GoTrue', () => {
    const seed = readFileSync(seedPath, 'utf8')
    const userColumns = seed.match(/insert into auth\.users \(([\s\S]*?)\) values/)?.[1]
    const identityColumns = seed.match(
      /insert into auth\.identities \(([\s\S]*?)\) values/,
    )?.[1]

    expect(userColumns).toContain('confirmation_token')
    expect(userColumns).toContain('recovery_token')
    expect(userColumns).toContain('email_change_token_new')
    expect(userColumns).toContain('email_change')
    expect(identityColumns?.split(',').map((column) => column.trim())).not.toContain(
      'email',
    )
  })

  it('normalizes legacy nullable Auth token fields', () => {
    const migration = readFileSync(tokenNormalizationMigrationPath, 'utf8')

    for (const column of [
      'confirmation_token',
      'recovery_token',
      'email_change_token_new',
      'email_change',
    ]) {
      expect(migration).toContain(`${column} = coalesce(${column}, '')`)
    }
  })
})
