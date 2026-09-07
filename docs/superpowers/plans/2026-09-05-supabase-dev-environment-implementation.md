# Supabase Dev Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo project Supabase Cloud `Ice Factory Dev`, dựng schema và dữ liệu thử, rồi tách local/Vercel Preview khỏi Supabase production.

**Architecture:** Dùng một Supabase project dev lâu dài trong cùng organization với production. Mọi migration được áp dụng và kiểm tra trên dev trước; ứng dụng local và Vercel Preview dùng khóa dev, còn nhánh `main` và Vercel Production tiếp tục dùng project production.

**Tech Stack:** Supabase Cloud/Postgres 17, Supabase MCP, Supabase JS, Next.js 16, Vitest, GitHub Actions, Vercel Preview.

**Spec:** `docs/superpowers/specs/2026-09-05-supabase-dev-environment-design.md`

## Global Constraints

- Organization đích là `Ice Factory` (`fujkxhvqfdivgewvwwnz`), hiện ở gói Free.
- Project production là `Ice Factory` (`mqclrhhatdkghvdebbyq`) và không được thay đổi trong quá trình bootstrap dev.
- Project dev có tên `Ice Factory Dev`, region `ap-south-1`, chi phí đã kiểm tra là `0 USD/tháng`.
- Không sao chép dữ liệu, người dùng, session hoặc secret production sang dev.
- Mọi DDL phải xuất phát từ các file đã commit trong `supabase/migrations`.
- Seed `quanly / 123456` và `nhanvien / 123456` chỉ được chạy trên local hoặc project dev đã xác nhận đúng project ref.
- Không ghi URL, publishable key, service-role key hoặc database password thật vào Git.
- `SUPABASE_SERVICE_ROLE_KEY` không bao giờ có tiền tố `NEXT_PUBLIC_`.
- Mọi lệnh reset/seed phải kiểm tra project ref trước; tuyệt đối không reset production.
- Nhánh làm việc là `dev`; phát hành production chỉ diễn ra sau Pull Request `dev → main`.

---

## File Map

- Modify: `scripts/verify-env.mjs` — kiểm tra URL Supabase có khớp project ref được mong đợi.
- Modify: `scripts/release-scripts.test.ts` — bảo vệ quy tắc không trỏ nhầm project.
- Modify: `.env.example` — mô tả các biến dev/production mà không chứa giá trị thật.
- Modify: `.github/workflows/ci.yml` — chạy CI khi đẩy lên cả `dev` và `main`.
- Modify: `supabase/seed.sql` — đổi chú thích để xác định seed chỉ dành cho local/Cloud Dev cô lập; không đổi dữ liệu seed.
- Create: `docs/operations/supabase-environments.md` — runbook dev → production và cấu hình Vercel.
- External: Supabase project `Ice Factory Dev` — Database, Auth, Realtime và migration history độc lập.
- Local-only: `.env.local` — URL/key dev; file này vẫn bị `.gitignore` loại trừ.

---

### Task 1: Add a Supabase target guard

**Files:**
- Modify: `scripts/release-scripts.test.ts`
- Modify: `scripts/verify-env.mjs`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `validateEnvironment(env, options)` hiện có.
- Produces: biến tùy chọn `SUPABASE_EXPECTED_PROJECT_REF`; khi có giá trị, hostname trong `NEXT_PUBLIC_SUPABASE_URL` phải được tạo từ chính project ref đó với hậu tố `.supabase.co`.

- [ ] **Step 1: Write the failing target-mismatch test**

Thêm vào `scripts/release-scripts.test.ts`:

```ts
it('rejects a Supabase URL that does not match the expected project ref', () => {
  const result = validateEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: 'https://production-ref.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
    SUPABASE_EXPECTED_PROJECT_REF: 'development-ref',
    APP_TIME_ZONE: 'Asia/Bangkok',
  })

  expect(result.ok).toBe(false)
  expect(result.errors).toContain('Supabase URL không khớp project ref được cấu hình.')
  expect(JSON.stringify(result)).not.toContain('production-ref')
  expect(JSON.stringify(result)).not.toContain('development-ref')
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
corepack pnpm test scripts/release-scripts.test.ts
```

Expected: FAIL because `validateEnvironment` does not compare project refs yet.

- [ ] **Step 3: Implement the minimal guard**

Trong `validateEnvironment`, sau khi parse URL thành công, thêm phép so sánh không làm lộ giá trị:

```js
const expectedProjectRef = env.SUPABASE_EXPECTED_PROJECT_REF?.trim()
if (
  expectedProjectRef
  && url?.hostname.toLowerCase() !== `${expectedProjectRef.toLowerCase()}.supabase.co`
) {
  errors.push('Supabase URL không khớp project ref được cấu hình.')
}
```

Thêm vào `.env.example`:

```dotenv
# Project ref công khai dùng để ngăn local/Preview trỏ nhầm Supabase project.
SUPABASE_EXPECTED_PROJECT_REF=
```

- [ ] **Step 4: Run focused verification**

Run:

```powershell
corepack pnpm test scripts/release-scripts.test.ts
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all commands exit `0`.

- [ ] **Step 5: Commit the guard**

```powershell
git add scripts/verify-env.mjs scripts/release-scripts.test.ts .env.example
git commit -m "chore: guard Supabase environment targets"
```

---

### Task 2: Provision the isolated Supabase Cloud project

**Files:** None.

**Interfaces:**
- Consumes: organization `fujkxhvqfdivgewvwwnz`, project name `Ice Factory Dev`, region `ap-south-1`.
- Produces: dev `project_ref`, project URL and active publishable key; secret keys remain outside Git and chat output.

- [ ] **Step 1: Reconfirm cost immediately before creation**

Use Supabase MCP `get_cost` with:

```json
{
  "organization_id": "fujkxhvqfdivgewvwwnz",
  "type": "project"
}
```

Expected: `amount: 0`, `recurrence: monthly`. Stop and ask the user again if the value is no longer zero.

- [ ] **Step 2: Obtain the cost confirmation token**

Use `confirm_cost` with the exact amount returned in Step 1:

```json
{
  "amount": 0,
  "recurrence": "monthly",
  "type": "project"
}
```

- [ ] **Step 3: Create the project**

Use `create_project` with the runtime confirmation ID returned by Step 2:

```ts
await createProject({
  name: 'Ice Factory Dev',
  organization_id: 'fujkxhvqfdivgewvwwnz',
  region: 'ap-south-1',
  confirm_cost_id: costConfirmation.id,
})
```

`costConfirmation.id` is the runtime result of Step 2 and must not be stored in source control.

- [ ] **Step 4: Wait for healthy status**

Poll `get_project` using the returned project ID with bounded waits. Expected final status: `ACTIVE_HEALTHY`, database engine PostgreSQL 17.

- [ ] **Step 5: Record non-secret runtime identifiers safely**

Read the project URL with `get_project_url` and active publishable key with `get_publishable_keys`. Do not print a service-role key or put any returned value in tracked files. Keep the dev project ID available for Tasks 3–5.

- [ ] **Step 6: Prove production was not modified**

Call `get_project` for production ID `mqclrhhatdkghvdebbyq` and confirm its status remains `ACTIVE_HEALTHY`. List projects and confirm exactly two named projects: `Ice Factory` and `Ice Factory Dev`.

---

### Task 3: Apply the committed schema to Ice Factory Dev

**Files:**
- Read: `supabase/migrations/*.sql`

**Interfaces:**
- Consumes: healthy dev project ID from Task 2 and the 29 ordered migration files below.
- Produces: dev schema matching the repo, with independent Auth, RLS, RPC and Realtime configuration.

- [ ] **Step 1: Confirm the target before every DDL batch**

Call `get_project` for the dev project ID and require `name = Ice Factory Dev`. Do not use the project-scoped production MCP connection for this task; every call must pass the explicit dev project ID.

- [ ] **Step 2: Apply migrations sequentially and stop on first failure**

For each file, read its full SQL and call project-ID-scoped `apply_migration`. Use the descriptive filename stem as the migration name and preserve this order:

```text
202608120001_extensions_and_types.sql
202608120002_core_tables.sql
202608120003_rls_and_audit.sql
202608120004_idempotency_helpers.sql
202608120005_catalog_policies.sql
202608120006_sales.sql
202608120007_create_sale_rpc.sql
202608120008_record_receipt_rpc.sql
20260812171500_username_password_auth.sql
20260812175500_normalize_auth_user_tokens.sql
20260813043118_production_tables_v2.sql
20260813043143_reconciled_production_rpcs.sql
20260813043200_harden_record_receipt_locking.sql
20260815081525_inventory_stock_counts.sql
20260815081529_record_stock_count.sql
20260815160625_inventory_reversal_compatibility.sql
20260815161404_expenses.sql
20260815161407_expense_storage.sql
20260815162813_daily_closing.sql
20260815192858_reporting_views.sql
20260816053020_expense_cancelled_status.sql
20260816053022_cancellation_and_versions.sql
20260816083210_cancellation_followup_hardening.sql
20260816110000_cancellation_null_input_hardening.sql
20260904054132_realtime_machine_production.sql
20260904141336_production_fk_indexes.sql
20260904141535_preserve_harvest_quantity_owner.sql
20260905044629_delete_production_action.sql
20260905052000_scope_delete_to_production_day.sql
```

Expected: every call returns success. On failure, capture the failing filename and error; do not skip ahead and do not touch production.

- [ ] **Step 3: Verify the schema contract**

Run read-only SQL on the dev project:

```sql
select
  to_regclass('public.profiles') is not null as has_profiles,
  to_regclass('public.machines') is not null as has_machines,
  to_regclass('public.machine_runs') is not null as has_machine_runs,
  to_regclass('public.machine_harvests') is not null as has_machine_harvests,
  to_regprocedure('public.start_machine(uuid,uuid)') is not null as has_start_rpc,
  to_regprocedure('public.delete_production_action(text,uuid,uuid,uuid,uuid)') is not null as has_delete_rpc;
```

Expected: all six values are `true`.

- [ ] **Step 4: Verify migration and advisor state**

List dev migrations and confirm 29 successful entries. Run security and performance advisors. Compare warnings with production baseline; stop for any new ERROR or security issue not explained by the intentional RPC authorization pattern.

---

### Task 4: Seed only the development project

**Files:**
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: dev project ID and existing idempotent seed SQL.
- Produces: two test users, matching profiles, one test machine, one test customer and opening inventory data in dev only.

- [ ] **Step 1: Clarify the seed safety boundary in source**

Change the opening comment in `supabase/seed.sql` to:

```sql
-- DEVELOPMENT SEED ONLY: run on Supabase local or the isolated Ice Factory Dev project.
-- Never execute this file on the Ice Factory production project.
```

Do not change the test usernames, password hash or fixture IDs.

- [ ] **Step 2: Verify the target is empty and is the dev project**

Call `get_project` and require `name = Ice Factory Dev`. Then run:

```sql
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.machines) as machines;
```

Expected before first seed: all counts are `0`.

- [ ] **Step 3: Execute the seed as data, not as a schema migration**

Read the full `supabase/seed.sql` and run it using project-ID-scoped `execute_sql` against `Ice Factory Dev`. Do not use `apply_migration`, because seed data must not become a schema migration.

- [ ] **Step 4: Run the seed a second time to prove idempotency**

Execute the same file again. Expected: success with no unique-constraint error and no duplicated fixture rows.

- [ ] **Step 5: Verify exact fixture counts**

Run:

```sql
select
  (select count(*) from public.profiles where username in ('quanly', 'nhanvien')) as test_profiles,
  (select count(*) from public.machines where code = 'MAY-E2E') as test_machines,
  (select count(*) from public.customers where id = '33333333-3333-4333-8333-333333333333') as test_customers,
  (select count(*) from public.inventory_ledger where source_type = 'local_seed') as opening_rows;
```

Expected: `test_profiles = 2`, `test_machines = 1`, `test_customers = 1`, `opening_rows = 1`.

- [ ] **Step 6: Commit the seed safety comment**

```powershell
git add supabase/seed.sql
git commit -m "docs: mark fixtures as development-only"
```

---

### Task 5: Point local development at Ice Factory Dev

**Files:**
- Local-only: `.env.local`

**Interfaces:**
- Consumes: dev URL, active publishable key, dev service-role key supplied from the Supabase Dashboard, and dev project ref.
- Produces: local Next.js app connected only to Ice Factory Dev.

- [ ] **Step 1: Obtain the dev secret without exposing it**

The user opens `Ice Factory Dev → Project Settings → API Keys`, copies the active secret/service-role key and places it directly in `.env.local`. Do not paste it into chat, terminal history, screenshots or tracked documentation.

- [ ] **Step 2: Replace the local environment atomically**

The user edits the ignored `.env.local` directly in the IDE. Set `NEXT_PUBLIC_SUPABASE_URL` to the exact URL returned in Task 2, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the active dev publishable key, `SUPABASE_SERVICE_ROLE_KEY` to the dev secret supplied locally by the user, `SUPABASE_EXPECTED_PROJECT_REF` to the dev project ID, and `APP_TIME_ZONE` to `Asia/Bangkok`.

Before saving, verify none of the three Supabase values belong to production project `mqclrhhatdkghvdebbyq`.

- [ ] **Step 3: Validate the environment contract**

```powershell
corepack pnpm verify:env -- --production
```

Expected: `[verify-env] OK` and exit `0`.

- [ ] **Step 4: Verify both dev logins through Supabase Auth**

Using the dev URL and publishable key from environment, call `signInWithPassword` for technical emails derived from usernames:

```text
quanly@account.icefactory.invalid / 123456
nhanvien@account.icefactory.invalid / 123456
```

Expected: both return a session; sign out after each verification.

- [ ] **Step 5: Run the application and smoke test dev**

```powershell
corepack pnpm dev
```

In another terminal:

```powershell
corepack pnpm smoke -- http://localhost:3000
```

Expected: health, login page, manifest and service worker checks pass. Manually confirm `quanly` sees management navigation while `nhanvien` does not.

---

### Task 6: Run a Realtime production acceptance test on dev

**Files:** None.

**Interfaces:**
- Consumes: running local app connected to dev and seeded `Máy đá E2E`.
- Produces: evidence that Auth, RLS, RPC, audit and Realtime work together on the cloud dev project.

- [ ] **Step 1: Open two independent browser sessions**

Sign in as `quanly` in one session and `nhanvien` in another. Open Sản xuất in both sessions and select the same production day.

- [ ] **Step 2: Exercise the complete machine flow**

From the employee session, perform:

```text
Bắt đầu chạy → Xả đá → nhập 10 bao → Tắt máy
```

Expected: every confirmation shows machine name and action time; the manager session updates without a manual reload.

- [ ] **Step 3: Verify the dedicated machine log**

Open `Nhật ký máy` in both sessions. Expected colors: start green, harvest blue, stop red. Confirm the employee has no delete control.

- [ ] **Step 4: Verify manager-only deletion and audit**

From the manager session, delete `Tắt máy`, then `Xả đá`, then `Bắt đầu chạy`. Expected: reverse-order enforcement, machine state restoration and three audit events. Attempt direct deletion as the employee and expect a forbidden response.

- [ ] **Step 5: Confirm production remains untouched**

Query production only with a read-only check of its latest migration count and project health. Do not compare or copy business rows.

---

### Task 7: Document and enable the dev release workflow

**Files:**
- Create: `docs/operations/supabase-environments.md`
- Modify: `docs/operations/deployment.md`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: dev project ref and verified workflow from Tasks 2–6.
- Produces: repeatable operator runbook and CI coverage on branch `dev`.

- [ ] **Step 1: Extend CI branch coverage**

Change:

```yaml
push:
  branches: [main]
```

to:

```yaml
push:
  branches: [dev, main]
```

Keep the existing isolated local Supabase job unchanged; CI must never point at Cloud Dev or production.

- [ ] **Step 2: Write the environment runbook**

Create `docs/operations/supabase-environments.md` with these exact sections:

```markdown
# Môi trường Supabase
## Sơ đồ dev và production
## Tạo migration mới
## Áp dụng và kiểm tra trên Ice Factory Dev
## Cấu hình local
## Cấu hình Vercel Preview
## Phát hành dev → main → production
## Kiểm tra đúng project ref
## Reset dữ liệu dev
## Xử lý migration thất bại
```

Document dev and production project refs because refs are identifiers, not secrets. Never include keys or passwords.

- [ ] **Step 3: Update the deployment runbook**

In `docs/operations/deployment.md`, replace the generic Preview recommendation with an explicit link to `supabase-environments.md` and state:

```text
Preview chỉ dùng Ice Factory Dev; Production chỉ dùng Ice Factory.
Migration phải đạt kiểm thử trên dev trước khi áp dụng cùng nội dung lên production.
```

- [ ] **Step 4: Document Vercel configuration for the user**

The runbook must instruct the user to configure:

| Variable | Preview | Production |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Dev URL | Production URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dev key | Production key |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev secret | Production secret |
| `SUPABASE_EXPECTED_PROJECT_REF` | Dev ref | `mqclrhhatdkghvdebbyq` |
| `APP_TIME_ZONE` | `Asia/Bangkok` | `Asia/Bangkok` |

The user owns Vercel configuration. Do not change Production variables through automation.

- [ ] **Step 5: Verify and commit documentation/CI**

```powershell
corepack pnpm lint
corepack pnpm typecheck
git diff --check
git add .github/workflows/ci.yml docs/operations/deployment.md docs/operations/supabase-environments.md
git commit -m "docs: add Supabase dev release workflow"
```

Expected: commands exit `0`; no secret-like values appear in staged diff.

---

### Task 8: Final verification and handoff

**Files:** All files modified by Tasks 1, 4 and 7.

**Interfaces:**
- Consumes: healthy Cloud Dev, configured local environment and completed acceptance evidence.
- Produces: a clean `dev` branch ready for user review and later Pull Request to `main`.

- [ ] **Step 1: Run the complete local verification suite**

```powershell
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm audit --audit-level=high
git diff --check
```

Expected: all commands exit `0`; integration tests that explicitly require local Supabase may remain skipped outside the CI job.

- [ ] **Step 2: Verify Cloud Dev health and advisors**

Use project-ID-scoped Supabase MCP calls to confirm:

```text
Project name: Ice Factory Dev
Status: ACTIVE_HEALTHY
Test profiles: 2
Test machine: 1
Auth login: manager PASS, employee PASS
Realtime production flow: PASS
New critical/error advisors: 0
```

- [ ] **Step 3: Verify Git state**

```powershell
git status --short
git log --oneline -5
git rev-list --left-right --count origin/dev...HEAD
```

Expected: worktree clean. Report local commits that still require `git push origin dev`.

- [ ] **Step 4: Handoff Vercel-only actions**

Give the user the five Preview variable names, dev project ref and exact Vercel scope `Preview`. Do not reveal key values. Ask the user to redeploy the latest Preview, then run the smoke test against its URL before any `dev → main` merge.
