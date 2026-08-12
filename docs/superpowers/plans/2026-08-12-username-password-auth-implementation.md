# Username/Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace phone/PIN login with username/password login while preserving existing user IDs, roles, active state, phone contact information, and Supabase-backed sessions.

**Architecture:** The application normalizes a username and deterministically maps it to a server-side technical email used by Supabase Email/Password Auth. `public.profiles.username` is the visible unique identifier; authorization continues to use `auth.users.id` and active profiles. Existing Auth data is converted once in a guarded migration, while all future account creation and password resets use the server-only Supabase Admin API.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Supabase Auth/Postgres/RLS, Vitest, Playwright, pnpm.

## Global Constraints

- Work directly in `D:\Ice Factory\Ice-Factory-Manage`; do not create a worktree or dispatch sub-agents.
- Username is 3-32 characters, normalized to lowercase, begins with an ASCII letter or digit, and contains only ASCII letters, digits, `.`, `_`, or `-`.
- Password remains numeric and at least 6 digits.
- Phone is optional profile contact data and is never an Auth credential.
- Technical Auth email is `<normalized-username>@account.icefactory.invalid` and is never shown in UI, reports, logs, or audit data.
- No signup, invite, recovery, magic-link, OTP, or Auth email-sending flow is added.
- Service-role access remains server-only; browser code receives only the publishable key.
- Existing UUID, role, active state, password hash, and document foreign keys must remain unchanged.
- Preserve and restore the uncommitted Task 6 sales work before final verification.

---

### Task 1: Isolate pending sales work and add username contracts

**Files:**
- Modify: `src/modules/auth/auth.test.ts`
- Modify: `src/modules/auth/schema.ts`

**Interfaces:**
- Produces: `normalizeUsername(value: string): string`.
- Produces: `usernameToAuthEmail(username: string): string`.
- Produces: `loginSchema` parsing `{ username: string; password: string }`.
- Produces: `userCreateSchema` parsing username, optional phone, numeric password, name, and role.
- Produces: `userPasswordResetSchema` parsing `{ userId: string; password: string }`.

- [ ] **Step 1: Save the current Task 6 working tree without losing its existing backup**

Run:

```powershell
git stash push --include-untracked -m "pause-task6-for-username-auth"
git status --short
```

Expected: clean `main`; both Task 6 stashes remain visible in `git stash list`.

- [ ] **Step 2: Write failing username and password tests**

Add tests with hand-derived literals:

```ts
expect(loginSchema.parse({ username: ' QuanLy ', password: '123456' })).toEqual({
  username: 'quanly',
  password: '123456',
})
expect(usernameToAuthEmail('quanly')).toBe('quanly@account.icefactory.invalid')
expect(() => loginSchema.parse({ username: 'nhân viên', password: '123456' })).toThrow()
expect(() => loginSchema.parse({ username: 'nv1', password: '12345a' })).toThrow()
expect(userCreateSchema.parse({
  username: 'nhanvien01', phone: '', password: '123456',
  fullName: 'Nhân viên 01', role: 'employee',
}).phone).toBeNull()
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `corepack pnpm vitest run src/modules/auth/auth.test.ts`

Expected: FAIL because username mapping and the new schema contract do not exist.

- [ ] **Step 4: Implement the minimal schema and mapping**

Use one shared password schema and an anchored username regex:

```ts
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/
const numericPasswordSchema = z.string().regex(/^\d{6,}$/)

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@account.icefactory.invalid`
}
```

Keep phone normalization only for optional contact data; remove phone from `loginSchema`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `corepack pnpm vitest run src/modules/auth/auth.test.ts`

Expected: all auth schema and guard tests pass.

### Task 2: Change login action and responsive form

**Files:**
- Modify: `src/modules/auth/actions.ts`
- Modify: `src/components/forms/login-form.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Replaces: `signInWithPin({ phone, pin })`.
- Produces: `signInWithPassword({ username, password }): Promise<ActionResult<void>>`.

- [ ] **Step 1: Add an action test that catches the wrong Supabase credential field**

Test that a successful request for `QuanLy` sends this exact boundary payload:

```ts
{
  email: 'quanly@account.icefactory.invalid',
  password: '123456',
}
```

Also test that any Supabase credential error returns the same `INVALID_CREDENTIALS` result without exposing whether the username exists.

- [ ] **Step 2: Run the focused action test and verify RED**

Run: `corepack pnpm vitest run src/modules/auth/auth.test.ts`

Expected: FAIL because the action still sends `{ phone, password: pin }`.

- [ ] **Step 3: Implement username/password login**

Parse the new input, derive the technical email, and call:

```ts
supabase.auth.signInWithPassword({
  email: usernameToAuthEmail(parsed.data.username),
  password: parsed.data.password,
})
```

Keep the existing post-authentication profile lookup, inactive-account sign-out, session proxy, and server guards.

- [ ] **Step 4: Update the UI and E2E selectors**

The form fields are `Tên tài khoản` and `Mật khẩu`, with names `username` and `password`. Use `autoComplete="username"` and `autoComplete="current-password"`. Update the login page copy and Playwright credentials to `nhanvien` / `123456`.

- [ ] **Step 5: Run focused tests and Playwright discovery**

Run:

```powershell
corepack pnpm vitest run src/modules/auth/auth.test.ts
corepack pnpm exec playwright test --list
```

Expected: auth tests pass and Playwright lists the username-based auth test.

### Task 3: Change manager account creation and password reset

**Files:**
- Modify: `src/modules/admin/users/actions.test.ts`
- Modify: `src/modules/admin/users/service.ts`
- Modify: `src/modules/admin/users/actions.ts`
- Modify: `src/components/forms/user-admin-panel.tsx`
- Modify: `src/app/(app)/admin/users/page.tsx`

**Interfaces:**
- `CreateUserInput`: `{ username: string; phone: string | null; password: string; fullName: string; role: 'employee' | 'manager' }`.
- Replaces: `resetUserPin` with `resetUserPassword`.

- [ ] **Step 1: Write failing service tests**

Assert the real service result and state transition around the external Admin API boundary. The create request must contain:

```ts
{
  email: 'nhanvien01@account.icefactory.invalid',
  password: '123456',
  email_confirm: true,
}
```

The profile insert must contain `username: 'nhanvien01'`, optional `phone`, name, role, and the returned Auth UUID. Keep tests for successful compensation and the reconciliation-required branch when Auth-user deletion fails.

- [ ] **Step 2: Run focused admin tests and verify RED**

Run: `corepack pnpm vitest run src/modules/admin/users/actions.test.ts`

Expected: FAIL because the service still creates a phone Auth user and inserts no username.

- [ ] **Step 3: Implement server-only Admin API changes**

Change `AdminSupabaseClient` to accept `email`, `email_confirm`, and password. Keep service-role usage inside `server-only`. Rename reset schemas/actions/messages from PIN to password and preserve manager authorization.

- [ ] **Step 4: Update the manager UI**

Add required `Tên tài khoản`, optional `Số điện thoại liên hệ`, and `Mật khẩu ban đầu`. Display `@username` as the primary identifier and show phone only when present. Rename all reset-PIN UI to reset-password UI.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `corepack pnpm vitest run src/modules/admin/users/actions.test.ts src/modules/auth/auth.test.ts`

Expected: all focused tests pass.

### Task 4: Add the guarded Postgres/Auth migration and local seed

**Files:**
- Create: `supabase/migrations/20260812171500_username_password_auth.sql`
- Modify: `supabase/seed.sql`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces: non-null unique `public.profiles.username` with a database format check.
- Changes: `public.profiles.phone` to nullable.
- Converts the one known development manager to `quanly` while preserving UUID and password hash.

- [ ] **Step 1: Create the migration through the Supabase CLI**

Run `corepack pnpm exec supabase migration new username_password_auth`, then rename only that generated empty file to `supabase/migrations/20260812171500_username_password_auth.sql` before editing it.

- [ ] **Step 2: Write a guarded migration**

The migration must:

1. Abort unless the remote pre-state has exactly the known development manager and no unknown profiles.
2. Add `username text`, backfill `quanly`, enforce `NOT NULL`, unique, and regex constraints.
3. Drop `NOT NULL` from profile phone.
4. Set the existing Auth user's technical email and confirmed timestamp without changing `encrypted_password` or `id`.
5. Add the email identity, remove the phone identity, clear Auth phone, and set provider metadata to email.

Use named constraints:

```sql
profiles_username_format_check
profiles_username_key
```

The regex is `^[a-z0-9][a-z0-9._-]{2,31}$`. All conversion statements run in the migration transaction.

- [ ] **Step 3: Update the local seed**

Seed `quanly` and `nhanvien` as confirmed email/password Auth users with matching email identities and profiles. Keep their contact phone numbers in `public.profiles` and keep password `123456` represented only by its bcrypt hash.

- [ ] **Step 4: Update generated database shapes without losing sales types**

Add `username: string` and change profile phone fields to `string | null` in Row/Insert/Update types. Do not remove the uncommitted sales schema types already present when Task 6 is restored.

- [ ] **Step 5: Run static gates before remote mutation**

Run:

```powershell
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
git diff --check
```

Expected: all commands exit 0; integration tests may skip only when their documented credentials are absent.

### Task 5: Apply and verify the migration through Supabase MCP

**Files:**
- Verify: `supabase/migrations/20260812171500_username_password_auth.sql`

**Interfaces:**
- Consumes the single known manager account.
- Produces a remotely usable `quanly` / `123456` login with Phone Provider disabled.

- [ ] **Step 1: Re-run remote preflight checks**

Use read-only MCP SQL to verify exactly one joined `auth.users`/`profiles` record, UUID `71000000-0000-4000-8000-000000000001`, manager role, active state, existing phone identity, and no email identity. Abort on any mismatch.

- [ ] **Step 2: Apply the exact reviewed migration with MCP**

Call `apply_migration` with name `username_password_auth` and the SQL identical to the local migration file.

- [ ] **Step 3: Verify database and Auth invariants**

Use MCP SQL to assert:

- exactly one profile with username `quanly`;
- unchanged UUID, role, active state, and contact phone;
- Auth email confirmed, Auth phone cleared, exactly one email identity, and no phone identity;
- username constraints exist and RLS remains enabled;
- existing document foreign keys still reference the same UUID.

- [ ] **Step 4: Run Supabase security and performance advisors**

Resolve any new security finding. Record unrelated existing performance notices without changing unrelated schema.

### Task 6: Live login verification, restore Task 6, and commit

**Files:**
- Verify all modified files from Tasks 1-5.
- Restore uncommitted Task 6 sales files and merge overlapping `seed.sql` / `database.types.ts` changes.

**Interfaces:**
- Produces the completed username/password login while returning the sales work to the visible working tree.

- [ ] **Step 1: Verify Auth API login directly**

Use the MCP project URL and active publishable key without printing either secret-like value. Call Supabase `signInWithPassword` for `quanly@account.icefactory.invalid` / `123456`, verify the returned user UUID, then sign out.

- [ ] **Step 2: Run the app and execute the browser flow**

Start Next.js locally using command-scoped project URL/publishable key. Verify the responsive login UI accepts `quanly` / `123456`, reaches `/`, and exposes manager navigation. Do not expose or require the service-role key for login.

- [ ] **Step 3: Run final quality gates**

Run:

```powershell
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm exec playwright test --list
git diff --check
```

Expected: all commands exit 0; production build uses non-secret placeholder env values with `APP_TIME_ZONE=Asia/Bangkok`.

- [ ] **Step 4: Commit only the username-auth change**

Stage the plan, migration, auth/admin/UI/E2E changes, and only the username-related hunks from shared files. Commit:

```text
feat: replace phone login with username authentication
```

- [ ] **Step 5: Restore Task 6 sales work**

Apply the `pause-task6-for-username-auth` stash without dropping the older transfer backup. Resolve shared-file conflicts by retaining both username profile changes and sales schema/seed content. Re-run `corepack pnpm test`, lint, typecheck, and `git diff --check` on the restored working tree.
