# Ice Factory Management PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng website responsive dạng PWA để khoảng 10 người tại một xưởng nước đá nhập bán hàng, sản xuất, chi phí, thu nợ và kiểm kê bằng điện thoại; quản lý đối chiếu, khóa sổ, xem dashboard và xuất Excel trên máy tính.

**Architecture:** Một ứng dụng Next.js App Router viết bằng TypeScript cung cấp cả giao diện và backend-for-frontend. Nghiệp vụ nhiều bước chạy trong PostgreSQL transaction qua các Supabase RPC; giao diện không tự tính hoặc tự ghi các tổng tài chính/tồn kho quan trọng. Vercel Functions và Supabase cùng đặt tại Singapore.

**Tech Stack:** Node.js 24 LTS, pnpm 10, Next.js 16.x, React 19.x, TypeScript 5.x strict, Tailwind CSS 4.x, Supabase Auth/PostgreSQL/Storage, Zod, React Hook Form, Vitest, Playwright, ExcelJS, Serwist PWA.

## Global Constraints

- Đơn vị vận hành chính là `bao`; không mặc định quy đổi sang kilogram.
- Tiền lưu bằng số nguyên VND; số bao dùng `numeric(12,3)` và không âm.
- Múi giờ nghiệp vụ là `Asia/Bangkok`; ngày vận hành là 00:00:00–23:59:59.
- Một xưởng, khoảng 10 người dùng; hai vai trò `employee` và `manager`.
- Nhân viên nhập được mọi loại chứng từ nhưng chỉ sửa/hủy chứng từ của mình khi ngày chưa khóa.
- Quản lý duyệt chi phí, xử lý ngoại lệ, khóa/mở sổ và quản trị danh mục.
- Mọi nghiệp vụ nhiều bước phải atomic và idempotent.
- Không xóa vật lý chứng từ đã phát sinh; hủy bằng trạng thái và bút toán đảo.
- Tồn kho phiên bản đầu chỉ quản lý đá thành phẩm theo số bao.
- Chênh lệch tồn cảnh báo mặc định từ 5%; quản lý có thể thay đổi và thay đổi phải được audit.
- Mạng được giả định ổn định; PWA cache app shell nhưng không cam kết ghi dữ liệu ngoại tuyến.
- Mọi bảng public bật RLS; service-role key chỉ tồn tại phía server.
- Ảnh hóa đơn nằm trong Supabase Storage bucket riêng tư.
- Mỗi task phải kết thúc bằng `pnpm lint`, `pnpm typecheck` và các test liên quan trước khi commit.

## File Structure

```text
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx
    (app)/page.tsx
    (app)/sales/**
    (app)/production/**
    (app)/expenses/**
    (app)/receivables/**
    (app)/inventory/**
    (app)/closing/**
    (app)/reports/**
    (app)/admin/**
    api/reports/**
  components/
    app-shell/**
    forms/**
    ui/**
  modules/
    auth/**
    sales/**
    production/**
    expenses/**
    receivables/**
    inventory/**
    closing/**
    reporting/**
    admin/**
    audit/**
  lib/
    env.ts
    result.ts
    validation.ts
    supabase/{browser.ts,server.ts,admin.ts,database.types.ts}
  test/{factories.ts,setup.ts}
supabase/
  config.toml
  migrations/*.sql
  seed.sql
tests/e2e/**
public/{icons/**,manifest.webmanifest,sw.ts}
```

Mỗi thư mục `src/modules/<domain>` chứa `schema.ts` (input/type), `repository.ts` (database access), `service.ts` (nghiệp vụ), `actions.ts` hoặc route handler, component/page liên quan và test colocated. SQL là nguồn sự thật cho schema, constraint, RLS và transaction RPC; `database.types.ts` được sinh từ schema local.

---

### Task 1: Scaffold ứng dụng, quality gates và PWA shell

**Files:**
- Modify: `README.md`
- Create: `package.json`, `pnpm-lock.yaml`, `.npmrc`, `.nvmrc`, `.gitignore`, `.env.example`
- Create: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/lib/env.ts`, `src/lib/env.test.ts`
- Create: `vitest.config.ts`, `src/test/setup.ts`, `playwright.config.ts`
- Create: `public/manifest.webmanifest`, `public/sw.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`

**Interfaces:**
- Produces: `getEnv(): AppEnv` với `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_TIME_ZONE`.
- Produces: scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `db:start`, `db:reset`, `db:types`.

- [ ] **Step 1: Scaffold Next.js thủ công trong repo hiện tại**

Run:

```powershell
pnpm init
pnpm add next@^16 react@^19 react-dom@^19 @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers date-fns decimal.js exceljs clsx tailwind-merge @serwist/next
pnpm add -D typescript@^5 @types/node@^24 @types/react@^19 @types/react-dom@^19 tailwindcss@^4 @tailwindcss/postcss eslint eslint-config-next vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test supabase
```

Manually create the exact config/source files listed in this task because the repo already contains approved documentation and must not be regenerated or overwritten by `create-next-app`. Set `packageManager` to the installed pnpm 10 version and `engines.node` to `>=24 <25`. Expected: `pnpm dev` starts the App Router application and `pnpm build` succeeds.

Set these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > src/lib/supabase/database.types.ts"
  }
}
```

- [ ] **Step 2: Write the failing environment test**

```ts
// src/lib/env.test.ts
import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('rejects a missing service role key', () => {
    expect(() => parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable',
      APP_TIME_ZONE: 'Asia/Bangkok',
    })).toThrow('SUPABASE_SERVICE_ROLE_KEY')
  })
})
```

- [ ] **Step 3: Run the test and verify RED**

Run: `pnpm vitest run src/lib/env.test.ts`

Expected: FAIL because `parseEnv` does not exist.

- [ ] **Step 4: Implement typed environment parsing and scripts**

```ts
// src/lib/env.ts
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
```

Add the quality scripts to `package.json`, configure Vitest with `jsdom`, and place only variable names—not secrets—in `.env.example`.

- [ ] **Step 5: Add the installable app shell**

Use `lang="vi"`, Vietnamese metadata, theme color, manifest link and Serwist configuration. The first page must render `Quản lý xưởng nước đá` and never describe construction stone or brick.

```json
{
  "name": "Quản lý xưởng nước đá",
  "short_name": "Xưởng nước đá",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#075985",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 6: Verify the scaffold**

Run:

```powershell
pnpm vitest run src/lib/env.test.ts
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands exit 0. Installability is visible in Chromium DevTools with a valid manifest and service worker.

- [ ] **Step 7: Commit**

```powershell
git add package.json pnpm-lock.yaml .npmrc .nvmrc .gitignore .env.example next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs src public vitest.config.ts playwright.config.ts README.md
git commit -m "chore: scaffold ice factory pwa"
```

### Task 2: Supabase local, core schema, RLS và generated types

**Files:**
- Create: `supabase/config.toml`, `supabase/seed.sql`
- Create: `supabase/migrations/202608120001_extensions_and_types.sql`
- Create: `supabase/migrations/202608120002_core_tables.sql`
- Create: `supabase/migrations/202608120003_rls_and_audit.sql`
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`
- Generate: `src/lib/supabase/database.types.ts`
- Create: `src/modules/audit/audit.integration.test.ts`

**Interfaces:**
- Produces SQL enums: `app_role`, `document_status`, `operating_day_status`, `expense_status`, `sale_kind`, `payment_method`, `production_source_kind`, `inventory_entry_kind`.
- Produces core tables: `profiles`, `customers`, `machines`, `operating_days`, `settings`, `audit_log`, `idempotency_keys`.
- Produces helpers: `private.current_profile() returns public.profiles`, `private.require_manager() returns void`, `private.require_open_day(p_day date) returns void`, `private.write_audit(p_action text, p_entity_type text, p_entity_id uuid, p_reason text, p_before jsonb, p_after jsonb) returns uuid`.

- [ ] **Step 1: Initialize local Supabase and write a failing audit test**

Run: `pnpm supabase init`

```ts
// src/modules/audit/audit.integration.test.ts
import { describe, expect, it } from 'vitest'
import { adminClient } from '@/lib/supabase/admin'

describe('audit_log', () => {
  it('rejects direct deletion', async () => {
    const { error } = await adminClient.from('audit_log').delete().neq('id', '')
    expect(error?.message).toContain('audit_log is append-only')
  })
})
```

- [ ] **Step 2: Run database test and verify RED**

Run:

```powershell
pnpm db:start
pnpm db:reset
pnpm vitest run src/modules/audit/audit.integration.test.ts
```

Expected: FAIL because the table and trigger do not exist.

- [ ] **Step 3: Create exact core constraints**

The migrations must include these invariants:

```sql
create type public.app_role as enum ('employee', 'manager');
create type public.operating_day_status as enum ('open', 'locked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  phone text not null unique,
  full_name text not null check (length(trim(full_name)) between 2 and 100),
  role public.app_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operating_days (
  day date primary key,
  status public.operating_day_status not null default 'open',
  locked_at timestamptz,
  locked_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopened_by uuid references public.profiles(id),
  reopen_reason text,
  snapshot jsonb,
  check ((status = 'open') or (locked_at is not null and locked_by is not null))
);

create table public.settings (
  id boolean primary key default true check (id),
  time_zone text not null default 'Asia/Bangkok' check (time_zone = 'Asia/Bangkok'),
  stock_variance_warning_pct numeric(5,2) not null default 5 check (stock_variance_warning_pct between 0 and 100),
  allow_negative_stock boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
```

Create active flags on customers/machines instead of physical deletion. `audit_log` includes actor, action, entity type/id, reason, before/after JSON and timestamp; triggers reject UPDATE/DELETE on it.

- [ ] **Step 4: Add RLS and server clients**

RLS rules must allow authenticated active users to read operational data, restrict employee updates to their own open-day documents in later tables, and restrict `profiles.role`, `settings`, account activation and lock operations to managers. `adminClient` imports `server-only`; browser code only receives the publishable key.

- [ ] **Step 5: Generate types and verify GREEN**

Run:

```powershell
pnpm db:reset
pnpm db:types
pnpm vitest run src/modules/audit/audit.integration.test.ts
pnpm lint
pnpm typecheck
```

Expected: migration succeeds, append-only test passes and generated types compile.

- [ ] **Step 6: Commit**

```powershell
git add supabase src/lib/supabase src/modules/audit package.json pnpm-lock.yaml
git commit -m "feat: add core database and row security"
```

### Task 3: Phone/PIN authentication, roles and responsive app shell

**Files:**
- Create: `src/modules/auth/schema.ts`, `service.ts`, `actions.ts`, `auth.test.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/components/forms/login-form.tsx`
- Create: `src/app/(app)/layout.tsx`, `src/components/app-shell/mobile-nav.tsx`, `desktop-sidebar.tsx`, `user-menu.tsx`
- Create: `src/proxy.ts`
- Create: `src/app/(app)/admin/users/page.tsx`, `src/modules/admin/users/actions.ts`
- Create: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: Supabase clients and `profiles` from Task 2.
- Produces: `signInWithPin(input: { phone: string; pin: string }): Promise<ActionResult<void>>`.
- Produces: `requireUser(): Promise<AppUser>` and `requireManager(): Promise<AppUser>`.
- Produces: manager-only `createUser`, `resetUserPin`, `setUserActive` actions.

- [ ] **Step 1: Write failing schema and authorization tests**

```ts
// src/modules/auth/auth.test.ts
import { describe, expect, it } from 'vitest'
import { loginSchema } from './schema'

describe('loginSchema', () => {
  it('normalizes a Vietnamese phone and accepts a six-digit PIN', () => {
    expect(loginSchema.parse({ phone: '0912 345 678', pin: '123456' })).toEqual({
      phone: '+84912345678', pin: '123456',
    })
  })

  it('rejects a short PIN', () => {
    expect(() => loginSchema.parse({ phone: '0912345678', pin: '1234' })).toThrow()
  })
})
```

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm vitest run src/modules/auth/auth.test.ts`

Expected: FAIL because `loginSchema` is missing.

- [ ] **Step 3: Implement login and guards**

Use `supabase.auth.signInWithPassword({ phone, password: pin })`. Reject inactive profiles after authentication and sign them out. `src/proxy.ts` refreshes sessions and redirects unauthenticated requests to `/login`; server pages call `requireUser` or `requireManager` rather than trusting middleware alone.

```ts
export type AppUser = {
  id: string
  phone: string
  fullName: string
  role: 'employee' | 'manager'
}
```

- [ ] **Step 4: Implement responsive shell and user administration**

Mobile navigation exposes `Hôm nay`, `Nhập liệu`, `Cảnh báo`, `Tài khoản`. Desktop sidebar exposes domain pages. Manager creates users through the server-only admin client; raw PIN never enters application logs or `profiles`.

- [ ] **Step 5: Add and run the E2E authorization test**

```ts
// tests/e2e/auth.spec.ts
import { expect, test } from '@playwright/test'

test('employee cannot open user administration', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Số điện thoại').fill('0912345678')
  await page.getByLabel('Mã PIN').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/($|login)/)
})
```

Run: `pnpm vitest run src/modules/auth/auth.test.ts && pnpm test:e2e --grep "employee cannot"`

Expected: unit and E2E tests pass with seeded employee/manager users.

- [ ] **Step 6: Verify and commit**

```powershell
pnpm lint
pnpm typecheck
pnpm build
git add src tests supabase/seed.sql
git commit -m "feat: add phone pin authentication and app shell"
```

### Task 4: Shared domain primitives, action results and idempotency

**Files:**
- Create: `src/lib/result.ts`, `src/lib/validation.ts`
- Create: `src/modules/shared/money.ts`, `quantity.ts`, `operating-day.ts`, `idempotency.ts`
- Create: `src/modules/shared/money.test.ts`, `quantity.test.ts`, `operating-day.test.ts`
- Create: `supabase/migrations/202608120004_idempotency_helpers.sql`

**Interfaces:**
- Produces: `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError }`.
- Produces: `toVnd(input: string): number`, `toBagQuantity(input: string): string`.
- Produces: `getOperatingDay(now: Date): string` returning `YYYY-MM-DD` in `Asia/Bangkok`.
- Produces: SQL helper `private.claim_idempotency_key(p_key uuid, p_operation text, p_actor uuid)`.

- [ ] **Step 1: Write failing boundary tests**

```ts
it('keeps VND as an integer', () => {
  expect(toVnd('12000')).toBe(12000)
  expect(() => toVnd('12000.50')).toThrow('Số tiền phải là số nguyên')
})

it('allows at most three bag decimals', () => {
  expect(toBagQuantity('1.125')).toBe('1.125')
  expect(() => toBagQuantity('-1')).toThrow()
  expect(() => toBagQuantity('1.0001')).toThrow()
})

it('uses Bangkok date at the UTC boundary', () => {
  expect(getOperatingDay(new Date('2026-08-11T17:30:00Z'))).toBe('2026-08-12')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/modules/shared`

Expected: FAIL because shared primitives are missing.

- [ ] **Step 3: Implement minimal primitives**

Use Zod refinements and `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })`. Never use JavaScript floating-point arithmetic for money totals; SQL computes persisted totals and `decimal.js` is used for client preview only.

- [ ] **Step 4: Implement idempotency claim**

The SQL helper inserts `(key, operation, actor_id, status='processing')`; a unique violation loads the existing result. Completed operations store entity id/result JSON. Failed transactions roll back the claim together with the business writes.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm db:reset
pnpm vitest run src/modules/shared
pnpm lint
pnpm typecheck
git add src/lib src/modules/shared supabase/migrations/202608120004_idempotency_helpers.sql
git commit -m "feat: add shared business primitives"
```

### Task 5: Customer/machine catalogs and operating-day bootstrap

**Files:**
- Create: `src/modules/admin/catalog-schema.ts`, `catalog-service.ts`, `catalog-actions.ts`, `catalog.test.ts`
- Create: `src/app/(app)/admin/customers/page.tsx`, `src/app/(app)/admin/machines/page.tsx`
- Create: `src/components/forms/customer-form.tsx`, `machine-form.tsx`
- Create: `src/modules/closing/ensure-day.ts`, `ensure-day.integration.test.ts`
- Create: `supabase/migrations/202608120005_catalog_policies.sql`

**Interfaces:**
- Consumes: `requireManager`, `ActionResult`, operating-day helper.
- Produces: `CustomerOption { id, name, phone, paymentTermDays }` and `MachineOption { id, name }` queries for later forms.
- Produces: `ensureOperatingDay(day: string): Promise<void>` using `insert into public.operating_days(day) values ($1) on conflict (day) do nothing`.

- [ ] **Step 1: Write failing catalog validation tests**

```ts
it('requires a named wholesale customer', () => {
  expect(() => customerSchema.parse({ name: ' ', paymentTermDays: 7 })).toThrow()
})

it('does not allow a negative payment term', () => {
  expect(() => customerSchema.parse({ name: 'Đầu mối A', paymentTermDays: -1 })).toThrow()
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/modules/admin/catalog.test.ts`

Expected: FAIL because schemas/actions are absent.

- [ ] **Step 3: Implement manager-only catalog mutations**

Create, edit and deactivate customer/machine records. Active customers/machines appear in input forms; inactive entries remain readable on historical documents. Every mutation calls `private.write_audit` with before/after JSON.

- [ ] **Step 4: Implement operating-day creation**

`ensureOperatingDay` creates the day on the first valid write or dashboard visit. It never reopens a locked day. Add an integration assertion that two concurrent calls produce exactly one row.

- [ ] **Step 5: Verify UI, tests and commit**

Run:

```powershell
pnpm vitest run src/modules/admin src/modules/closing/ensure-day.integration.test.ts
pnpm lint
pnpm typecheck
```

Expected: employee mutations return `FORBIDDEN`; manager mutations pass and are audited.

```powershell
git add src supabase/migrations/202608120005_catalog_policies.sql
git commit -m "feat: add customer and machine catalogs"
```

### Task 6: Wholesale and retail sales transaction

**Files:**
- Create: `supabase/migrations/202608120006_sales.sql`
- Create: `supabase/migrations/202608120007_create_sale_rpc.sql`
- Create: `src/modules/sales/schema.ts`, `types.ts`, `repository.ts`, `service.ts`, `actions.ts`
- Create: `src/modules/sales/schema.test.ts`, `create-sale.integration.test.ts`
- Create: `src/app/(app)/sales/page.tsx`, `src/app/(app)/sales/new/wholesale/page.tsx`, `src/app/(app)/sales/new/retail/page.tsx`
- Create: `src/components/forms/wholesale-sale-form.tsx`, `retail-sale-form.tsx`, `sale-line-editor.tsx`
- Create: `tests/e2e/sales.spec.ts`

**Interfaces:**
- Consumes: `CustomerOption`, `ActionResult`, idempotency helper, open-day guard.
- Produces: `createSale(input: CreateWholesaleSale | CreateRetailSale): Promise<ActionResult<{ saleId: string }>>`.
- Produces SQL RPC `public.create_sale(p_input jsonb, p_idempotency_key uuid)`.
- Produces tables `sales`, `sale_lines`, `receivables`, `receipts`, `receipt_allocations`, `inventory_ledger`; total is `sum(quantity_bags * unit_price_vnd)`.

- [ ] **Step 1: Write failing discriminated-union tests**

```ts
it('requires a customer when wholesale credit remains', () => {
  expect(() => createSaleSchema.parse({
    kind: 'wholesale', operatingDay: '2026-08-12', customerId: null,
    lines: [{ quantityBags: '10', unitPriceVnd: 7000 }], paidNowVnd: 0,
    paymentMethod: 'cash', idempotencyKey: crypto.randomUUID(),
  })).toThrow('Khách hàng')
})

it('supports multiple retail prices in one shift', () => {
  const sale = createSaleSchema.parse({
    kind: 'retail', operatingDay: '2026-08-12', shiftCode: 'DAY',
    lines: [
      { quantityBags: '5', unitPriceVnd: 12000 },
      { quantityBags: '3', unitPriceVnd: 10000 },
    ], paidNowVnd: 90000, paymentMethod: 'cash',
    idempotencyKey: crypto.randomUUID(),
  })
  expect(sale.lines).toHaveLength(2)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/modules/sales/schema.test.ts`

Expected: FAIL because `createSaleSchema` does not exist.

- [ ] **Step 3: Create sales schema and constraints**

`sales` stores kind, day, customer, shift, status, paid-now amount, creator and version. `sale_lines` stores quantity and price; generated/stored `line_total_vnd` is numeric/integer-safe. Unique partial index prevents two active retail summaries with the same `(operating_day, shift_code)`.

- [ ] **Step 4: Implement atomic create RPC**

The RPC must:

```sql
-- ordered transaction responsibilities
perform private.require_open_day(v_day);
perform private.claim_idempotency_key(p_idempotency_key, 'create_sale', auth.uid());
-- validate customer/credit and sum line totals on the server
-- lock/read available stock before issuing it
-- insert sales and sale_lines
-- insert inventory_ledger issue entry using the table created in 202608120006_sales.sql
-- insert receivable and initial receipt/allocation when applicable
-- write audit and complete the idempotency result
```

Migration `202608120006_sales.sql` creates the complete structural columns and constraints for `receivables`, `receipts`, `receipt_allocations` and `inventory_ledger` because `create_sale` must write them atomically. Tasks 7 and 9 add their dedicated RPCs, reporting views, policies and user interfaces without redefining these tables. Reject `paidNowVnd > total`, negative quantities/prices, locked days and insufficient stock unless the setting permits negative stock.

- [ ] **Step 5: Build mobile-first forms and list**

Wholesale form: customer, rows of `số bao`/`đơn giá`, paid-now amount, payment method, note. Retail form: shift, one or more price rows, paid amount, note. Disable submit while pending and preserve inputs on server error.

- [ ] **Step 6: Prove atomicity and idempotency**

Integration tests must assert:

```ts
expect(secondCall.data.saleId).toBe(firstCall.data.saleId)
expect(await countSalesByKey(key)).toBe(1)
expect(await stockIssueForSale(firstCall.data.saleId)).toHaveLength(1)
```

Also force an insufficient-stock error and assert there is no sale, receivable, receipt or stock issue.

- [ ] **Step 7: Run E2E sale flow and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/sales
pnpm test:e2e --grep "bán sỉ|bán lẻ"
pnpm lint
pnpm typecheck
```

Expected: all tests pass; mobile viewport completes both sale kinds.

```powershell
git add src tests supabase
git commit -m "feat: add wholesale and retail sales"
```

### Task 7: Receivables, receipts and partial allocations

**Files:**
- Create: `supabase/migrations/202608120008_receivable_indexes_views_policies.sql`
- Create: `supabase/migrations/202608120009_record_receipt_rpc.sql`
- Create: `src/modules/receivables/schema.ts`, `types.ts`, `repository.ts`, `service.ts`, `actions.ts`
- Create: `src/modules/receivables/allocation.test.ts`, `record-receipt.integration.test.ts`
- Create: `src/app/(app)/receivables/page.tsx`, `src/app/(app)/receivables/[customerId]/page.tsx`
- Create: `src/components/forms/receipt-form.tsx`, `src/components/receivables/aging-table.tsx`
- Create: `tests/e2e/receivables.spec.ts`

**Interfaces:**
- Consumes: sale-created `receivables`; open-day/idempotency/audit helpers.
- Produces: `recordReceipt(input: RecordReceiptInput): Promise<ActionResult<{ receiptId: string }>>`.
- Produces SQL RPC `public.record_receipt(p_input jsonb, p_idempotency_key uuid)`.
- Produces `ReceivableSummary { customerId, outstandingVnd, overdueVnd, oldestDueDate }`.

- [ ] **Step 1: Write failing allocation tests**

```ts
it('rejects allocation above the receipt amount', () => {
  expect(() => recordReceiptSchema.parse({
    customerId: crypto.randomUUID(), operatingDay: '2026-08-12', amountVnd: 100000,
    paymentMethod: 'bank_transfer', allocations: [
      { receivableId: crypto.randomUUID(), amountVnd: 100001 },
    ], idempotencyKey: crypto.randomUUID(),
  })).toThrow('phân bổ')
})
```

- [ ] **Step 2: Run RED and implement receipt constraints**

Run: `pnpm vitest run src/modules/receivables/allocation.test.ts`

Expected: FAIL first. Then add receipt/allocation schema, unique idempotency key, positive amounts and same-customer enforcement.

- [ ] **Step 3: Implement locking allocation RPC**

Select target receivables `for update` in stable id order, reject allocations above each outstanding balance, insert receipt and allocations, leave `unallocated_vnd = receipt amount - allocations`, and audit the result. The RPC never silently applies unallocated money.

- [ ] **Step 4: Add customer debt and aging UI**

List total outstanding, overdue amount and oldest due date. Customer detail shows sales, allocations, receipt history and remaining debt. Receipt form can distribute one payment across several receivables and displays an explicit unallocated balance before save.

- [ ] **Step 5: Verify partial/multiple payments and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/receivables
pnpm test:e2e --grep "trả một phần"
pnpm lint
pnpm typecheck
```

Expected: a debt can be paid in two receipts; over-allocation rolls back; totals reconcile.

```powershell
git add src tests supabase
git commit -m "feat: add receivables and partial payments"
```

### Task 8: Production batches and shift totals without double counting

**Files:**
- Create: `supabase/migrations/202608120010_production.sql`
- Create: `supabase/migrations/202608120011_confirm_production_rpc.sql`
- Create: `src/modules/production/schema.ts`, `types.ts`, `repository.ts`, `service.ts`, `actions.ts`
- Create: `src/modules/production/reconciliation.test.ts`, `production.integration.test.ts`
- Create: `src/app/(app)/production/page.tsx`, `new/batch/page.tsx`, `new/shift-total/page.tsx`
- Create: `src/components/forms/production-batch-form.tsx`, `production-shift-form.tsx`
- Create: `src/components/production/reconciliation-card.tsx`
- Create: `tests/e2e/production.spec.ts`

**Interfaces:**
- Consumes: active machines, open-day/idempotency/audit helpers.
- Produces: `createProductionBatch`, `createProductionShiftTotal`, `selectOfficialProductionSource`.
- Produces tables `production_batches`, `production_shift_totals`, `production_source_selections`.
- Produces one official inventory receipt per `(day, shift, machine)`.

- [ ] **Step 1: Write failing reconciliation tests**

```ts
it('does not add batch and shift totals together', () => {
  expect(resolveOfficialQuantity({
    source: 'shift_total', batchGoodBags: '120', shiftGoodBags: '125',
  })).toBe('125')
})

it('shows the signed difference for review', () => {
  expect(calculateProductionVariance('120', '125')).toEqual({ bags: '5', pct: '4.167' })
})
```

- [ ] **Step 2: Run RED and create production schemas**

Run: `pnpm vitest run src/modules/production/reconciliation.test.ts`

Expected: FAIL before implementation. Enforce end time after start time, nonnegative good/rejected bags and unique machine/day/shift total.

- [ ] **Step 3: Implement official-source selection transaction**

Selecting `batches` uses the sum of active batch good bags; selecting `shift_total` uses that total only. Update selection by reversing the old inventory receipt and posting the new receipt in one transaction. Reject edits on locked days.

- [ ] **Step 4: Build combined mobile workflow**

Production page offers `Nhập từng mẻ` and `Nhập tổng cuối ca`. Reconciliation card shows batch total, shift total, difference and selected official source. Only a manager may confirm a source when both exist and differ.

- [ ] **Step 5: Verify no double count and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/production
pnpm test:e2e --grep "sản xuất"
pnpm lint
pnpm typecheck
```

Expected: switching source changes stock by only the difference; total is never batch + shift total.

```powershell
git add src tests supabase
git commit -m "feat: add reconciled production entry"
```

### Task 9: Inventory ledger, availability and stock count adjustment

**Files:**
- Create: `supabase/migrations/202608120012_inventory.sql`
- Create: `supabase/migrations/202608120013_stock_count_rpc.sql`
- Create: `src/modules/inventory/schema.ts`, `types.ts`, `repository.ts`, `service.ts`, `actions.ts`
- Create: `src/modules/inventory/balance.test.ts`, `stock-count.integration.test.ts`, `concurrency.integration.test.ts`
- Create: `src/app/(app)/inventory/page.tsx`, `src/app/(app)/inventory/count/page.tsx`
- Create: `src/components/forms/stock-count-form.tsx`, `src/components/inventory/ledger-table.tsx`
- Create: `tests/e2e/inventory.spec.ts`

**Interfaces:**
- Consumes: production receipts and sale issues.
- Produces: `getStockBalance(asOf?: Date): Promise<string>`.
- Produces: `recordStockCount(input): Promise<ActionResult<{ countId: string; varianceBags: string; variancePct: string }>>`.
- Produces SQL RPC `public.record_stock_count(p_input jsonb, p_idempotency_key uuid)`.

- [ ] **Step 1: Write failing balance/zero-denominator tests**

```ts
it('calculates expected stock from immutable movements', () => {
  expect(calculateBalance([
    { direction: 1, quantityBags: '100' },
    { direction: -1, quantityBags: '30.5' },
    { direction: 1, quantityBags: '2' },
  ])).toBe('71.5')
})

it('does not divide by zero', () => {
  expect(calculateStockVariance('0', '3')).toEqual({ bags: '3', pct: null, requiresReview: true })
})
```

- [ ] **Step 2: Run RED and finalize immutable ledger**

Run: `pnpm vitest run src/modules/inventory/balance.test.ts`

Expected: FAIL first. `inventory_ledger` rows are insert-only and contain source type/id, direction, quantity, day and reversal reference. UPDATE/DELETE triggers raise an exception.

- [ ] **Step 3: Implement count and adjustment transaction**

Lock the balance row/advisory key, compute expected stock, insert count, insert one signed adjustment equal to actual minus expected, calculate warning using current settings and write audit. A repeated idempotency key returns the same count.

- [ ] **Step 4: Prove concurrent oversell prevention**

Launch two sale transactions against stock for only one sale. Integration test expects exactly one success, one `INSUFFICIENT_STOCK`, one issue movement and a nonnegative balance.

- [ ] **Step 5: Build ledger/count UI and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/inventory
pnpm test:e2e --grep "kiểm kho"
pnpm lint
pnpm typecheck
```

Expected: expected/actual/variance are visible; variance above 5% is red; count adjustment reconciles closing balance.

```powershell
git add src tests supabase
git commit -m "feat: add immutable finished stock ledger"
```

### Task 10: Expenses, private attachments and approval workflow

**Files:**
- Create: `supabase/migrations/202608120014_expenses.sql`
- Create: `supabase/migrations/202608120015_expense_storage.sql`
- Create: `src/modules/expenses/schema.ts`, `types.ts`, `repository.ts`, `service.ts`, `actions.ts`
- Create: `src/modules/expenses/approval.test.ts`, `expense.integration.test.ts`
- Create: `src/app/(app)/expenses/page.tsx`, `src/app/(app)/expenses/new/page.tsx`, `src/app/(app)/expenses/review/page.tsx`
- Create: `src/components/forms/expense-form.tsx`, `src/components/expenses/expense-review-card.tsx`
- Create: `tests/e2e/expenses.spec.ts`

**Interfaces:**
- Produces: `createExpense`, `approveExpense`, `rejectExpense`, `getExpenseAttachmentUrl`.
- Produces tables `expense_categories`, `expenses`, `expense_attachments`.
- Produces private bucket `expense-receipts`; object path is `<operating-day>/<expense-id>/<uuid>.<ext>`.

- [ ] **Step 1: Write failing approval tests**

```ts
it('excludes pending expenses from official profit', () => {
  expect(sumApprovedExpenses([
    { amountVnd: 100000, status: 'pending' },
    { amountVnd: 200000, status: 'approved' },
  ])).toBe(200000)
})

it('requires a reason when rejecting', () => {
  expect(() => reviewExpenseSchema.parse({ decision: 'rejected', reason: '' })).toThrow()
})
```

- [ ] **Step 2: Run RED and implement expense schema**

Run: `pnpm vitest run src/modules/expenses/approval.test.ts`

Expected: FAIL first. Enforce positive integer VND, pending/approved/rejected state transitions and separate `reviewed_by/reviewed_at`.

- [ ] **Step 3: Implement private upload flow**

Server creates a signed upload URL after the expense row exists; accept JPEG, PNG or PDF up to 10 MB. Store metadata only after upload verification. Signed view URLs expire after 5 minutes. Employees can view operational attachments; only server/authorized users can create URLs.

- [ ] **Step 4: Implement manager review transaction**

Lock the expense, require `pending`, require manager, write decision/reason/reviewer and append audit. A second review returns `INVALID_STATE`; it does not overwrite the original reviewer.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/expenses
pnpm test:e2e --grep "chi phí"
pnpm lint
pnpm typecheck
```

Expected: pending cost is absent from official totals; approval adds it; unauthorized review and public attachment access fail.

```powershell
git add src tests supabase
git commit -m "feat: add expense approval and receipts"
```

### Task 11: Daily reconciliation, locking, reopening and immutable snapshots

**Files:**
- Create: `supabase/migrations/202608120016_daily_closing.sql`
- Create: `src/modules/closing/types.ts`, `repository.ts`, `service.ts`, `actions.ts`
- Create: `src/modules/closing/rules.test.ts`, `closing.integration.test.ts`
- Create: `src/app/(app)/closing/page.tsx`, `src/app/(app)/closing/[day]/page.tsx`
- Create: `src/components/closing/check-list.tsx`, `lock-day-dialog.tsx`, `reopen-day-dialog.tsx`
- Create: `tests/e2e/closing.spec.ts`

**Interfaces:**
- Consumes: sales, receivables, production, inventory, expenses.
- Produces: `DailyReconciliation` with check codes and totals.
- Produces: `lockOperatingDay(day, varianceOverrideReason?)` and `reopenOperatingDay(day, reason)`.
- Produces SQL RPCs `public.lock_operating_day` and `public.reopen_operating_day`.

- [ ] **Step 1: Write failing closing-rule tests**

```ts
it('blocks a day with pending expenses', () => {
  expect(evaluateClosingChecks(baseInput({ pendingExpenseCount: 1 })))
    .toContainEqual(expect.objectContaining({ code: 'PENDING_EXPENSES', blocking: true }))
})

it('allows a manager reason only for stock variance over threshold', () => {
  const checks = evaluateClosingChecks(baseInput({ stockVariancePct: 7, stockWarningPct: 5 }))
  expect(checks).toContainEqual(expect.objectContaining({ code: 'STOCK_VARIANCE', overridable: true }))
})
```

- [ ] **Step 2: Run RED and implement reconciliation query**

Run: `pnpm vitest run src/modules/closing/rules.test.ts`

Expected: FAIL first. Checks cover stock count, pending expenses, unnamed credit sales, invalid production source, missing required values and stock variance.

- [ ] **Step 3: Implement lock transaction**

Use a transaction-scoped advisory lock for the day. Recompute all totals inside the transaction; never trust browser totals. Block non-overridable errors. Store snapshot JSON containing schema version, computed totals, checks, threshold and override reason; set locked metadata and audit it.

- [ ] **Step 4: Enforce locked-day immutability everywhere**

Every create/update/cancel RPC calls `private.require_open_day`. Add integration tests that attempt sale, receipt, production, expense and stock-count writes after lock and assert `DAY_LOCKED` with unchanged counts.

- [ ] **Step 5: Implement reopen/relock**

Only manager can reopen with a nonblank reason. Reopen clears the active snapshot reference but audit retains the old snapshot. Relocking creates a new snapshot version; reports default to the newest locked version.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/closing
pnpm test:e2e --grep "khóa sổ"
pnpm lint
pnpm typecheck
```

Expected: clean day locks; blocking errors prevent lock; 7% variance requires a manager reason; reopening is audited.

```powershell
git add src tests supabase
git commit -m "feat: add daily reconciliation and locking"
```

### Task 12: Dashboard, alerts and desktop/mobile views

**Files:**
- Create: `supabase/migrations/202608120017_reporting_views.sql`
- Create: `src/modules/reporting/types.ts`, `repository.ts`, `dashboard-service.ts`, `alerts.ts`
- Create: `src/modules/reporting/dashboard.test.ts`, `alerts.test.ts`
- Modify: `src/app/(app)/page.tsx`
- Create: `src/components/dashboard/kpi-card.tsx`, `quick-actions.tsx`, `alert-list.tsx`, `sales-production-chart.tsx`
- Create: `src/app/(app)/alerts/page.tsx`
- Create: `tests/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: all operational modules and locked snapshots.
- Produces: `getDailyDashboard(day): Promise<DailyDashboard>`.
- Produces: alerts `STOCK_VARIANCE`, `INSUFFICIENT_STOCK`, `OVERDUE_DEBT`, `PENDING_EXPENSE`, `PRODUCTION_MISMATCH`, `UNLOCKED_PREVIOUS_DAY`, `OUTLIER_VALUE`.

- [ ] **Step 1: Write failing KPI tests**

```ts
it('uses approved expenses only for official profit', () => {
  expect(buildDashboard({ revenueVnd: 1_000_000, approvedExpenseVnd: 200_000, pendingExpenseVnd: 50_000 }))
    .toMatchObject({ officialProfitVnd: 800_000, pendingExpenseVnd: 50_000 })
})

it('keeps wholesale and retail revenue separate and reconciled', () => {
  const result = buildRevenueKpis({ wholesaleVnd: 700000, retailVnd: 300000 })
  expect(result.totalVnd).toBe(1000000)
})
```

- [ ] **Step 2: Run RED and implement reporting views**

Run: `pnpm vitest run src/modules/reporting/dashboard.test.ts src/modules/reporting/alerts.test.ts`

Expected: FAIL first. SQL views expose aggregated values but no editable totals.

- [ ] **Step 3: Build mobile dashboard**

Show operating day/status, production bags, sold bags, wholesale/retail revenue, collected amount, new/total debt, opening/expected/count/variance stock, approved/pending expenses and temporary profit. Provide six quick actions agreed in the spec.

- [ ] **Step 4: Build desktop dashboard and alerts**

At desktop width, use a multi-column KPI grid, daily production-vs-sales chart, revenue split and filterable alerts. Outlier alerts use a transparent rule: current quantity or unit price greater than 2x or less than 0.5x the median of the previous 30 active records; label them informational, never block saving.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm vitest run src/modules/reporting
pnpm test:e2e --grep "dashboard"
pnpm lint
pnpm typecheck
pnpm build
```

Expected: mobile has no horizontal overflow; desktop exposes filters; KPI totals equal seeded source transactions.

```powershell
git add src tests supabase
git commit -m "feat: add operations dashboard and alerts"
```

### Task 13: Excel reports and backup export

**Files:**
- Create: `src/modules/reporting/excel/styles.ts`, `workbook.ts`, `daily-report.ts`, `monthly-report.ts`, `detail-reports.ts`, `backup-export.ts`
- Create: `src/modules/reporting/excel/reconciliation.test.ts`
- Create: `src/app/api/reports/daily/route.ts`, `monthly/route.ts`, `sales/route.ts`, `production/route.ts`, `expenses/route.ts`, `receivables/route.ts`, `inventory/route.ts`, `audit/route.ts`, `backup/route.ts`
- Create: `src/app/(app)/reports/page.tsx`
- Create: `tests/e2e/reports.spec.ts`

**Interfaces:**
- Consumes: reporting repositories and latest locked snapshot.
- Produces: `buildDailyWorkbook(input): Promise<Buffer>` and corresponding monthly/detail builders.
- Produces authenticated download routes with Vietnamese filenames and explicit date range.

- [ ] **Step 1: Write a failing workbook reconciliation test**

```ts
it('writes the same revenue total as the dashboard query', async () => {
  const source = reportFixture({ wholesaleVnd: 700000, retailVnd: 300000 })
  const buffer = await buildDailyWorkbook(source)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  expect(workbook.getWorksheet('Tổng hợp')?.getCell('B5').value).toBe(1000000)
})
```

- [ ] **Step 2: Run RED and implement workbook baseline**

Run: `pnpm vitest run src/modules/reporting/excel/reconciliation.test.ts`

Expected: FAIL before builders exist. Use typed numeric/date cells, frozen headers, filters, currency/quantity formats and source metadata (`ngày xuất`, `người xuất`, `trạng thái khóa`).

- [ ] **Step 3: Implement all agreed report datasets**

Daily/monthly summary, sales detail, production by day/machine/shift, expenses by category/status, receivable aging/payment history, inventory ledger, audit log and full JSON/CSV backup. Monthly summary separates locked from open days.

- [ ] **Step 4: Add pre-download reconciliation**

Each builder compares workbook source totals against dashboard/report query totals before serialization. On mismatch, return `REPORT_RECONCILIATION_FAILED` and no file. Backup export includes schema version and exported-at timestamp.

- [ ] **Step 5: Verify downloads and commit**

Run:

```powershell
pnpm vitest run src/modules/reporting/excel
pnpm test:e2e --grep "xuất Excel"
pnpm lint
pnpm typecheck
```

Expected: authenticated manager downloads valid XLSX; employee cannot download audit/backup; totals reconcile.

```powershell
git add src tests
git commit -m "feat: add reconciled excel reports"
```

### Task 14: Cancellation, optimistic concurrency and complete audit history

**Files:**
- Create: `supabase/migrations/202608120018_cancellation_and_versions.sql`
- Create: `src/modules/shared/version-conflict.ts`, `version-conflict.test.ts`
- Modify: services/actions/pages for sales, receipts, production, expenses and stock counts
- Create: `src/components/forms/cancel-document-dialog.tsx`
- Create: `src/app/(app)/admin/audit/page.tsx`, `src/modules/audit/repository.ts`
- Create: `tests/e2e/audit-and-cancel.spec.ts`

**Interfaces:**
- Produces: `cancelDocument({ entityType, entityId, expectedVersion, reason })` manager/owner-aware operation.
- Produces errors `VERSION_CONFLICT`, `DAY_LOCKED`, `INVALID_STATE`.
- Produces filtered audit timeline by actor, date, entity and action.

- [ ] **Step 1: Write failing version/cancellation tests**

```ts
it('rejects a stale edit', () => {
  expect(() => assertVersion({ expected: 2, actual: 3 })).toThrow('VERSION_CONFLICT')
})

it('requires a cancellation reason', () => {
  expect(() => cancelSchema.parse({ reason: ' ' })).toThrow()
})
```

- [ ] **Step 2: Run RED and add version columns/conditional updates**

Run: `pnpm vitest run src/modules/shared/version-conflict.test.ts`

Expected: FAIL first. Mutations update `where id = ? and version = expected`; zero rows becomes `VERSION_CONFLICT`, never last-write-wins.

- [ ] **Step 3: Implement domain-specific cancellation transactions**

- Sale cancellation reverses its stock issue and receivable/initial allocation only when subsequent allocations allow it; otherwise manager must cancel/reallocate receipts first.
- Receipt cancellation reverses allocations and marks receipt canceled.
- Production cancellation reverses the official stock receipt.
- Approved expense cancellation creates an audited canceled state and removes it from official expense totals.
- Stock counts are not deleted; a new recount/adjustment corrects them.

- [ ] **Step 4: Add complete audit UI and ownership tests**

Employee may cancel only their own open-day documents. Manager may cancel any open-day document with reason. Audit page shows before/after JSON in a readable diff and never exposes auth tokens or PIN.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
pnpm db:reset
pnpm vitest run src/modules/shared src/modules/audit
pnpm test:e2e --grep "hủy|lịch sử"
pnpm lint
pnpm typecheck
```

Expected: every cancellation reconciles ledger/debt totals and produces one audit event; stale edits are rejected.

```powershell
git add src tests supabase
git commit -m "feat: add safe cancellation and audit history"
```

### Task 15: Production hardening, deployment and cutover runbook

**Files:**
- Create: `vercel.json`, `.github/workflows/ci.yml`
- Create: `docs/operations/deployment.md`, `backup-restore.md`, `cutover.md`, `user-acceptance.md`
- Create: `scripts/verify-env.mjs`, `scripts/smoke-production.mjs`
- Modify: `README.md`, `.env.example`
- Create: `tests/e2e/full-day.spec.ts`

**Interfaces:**
- Consumes: complete application.
- Produces: reproducible CI, Singapore deployment config, backup/restore and clean-start procedure.

- [ ] **Step 1: Write the full-day E2E acceptance flow**

```ts
test('runs one operating day from opening stock to locked report', async ({ page }) => {
  // Seed opening stock and customer through authenticated setup.
  // Record production, wholesale sale on credit, retail sale, partial receipt,
  // approved expense and final stock count.
  // Lock the day and download the daily report.
  await expect(page.getByText('Đã khóa')).toBeVisible()
  await expect(page.getByText('Chênh lệch')).toContainText('0')
})
```

Implement the fixture with concrete seeded values: opening 100 bags, production 50, wholesale 30 at 7,000 VND, retail 20 at 12,000 VND, final expected/count 100, approved expense 50,000 VND, partial wholesale receipt 100,000 VND. Assert revenue 450,000 VND, remaining wholesale debt 110,000 VND and temporary profit 400,000 VND.

- [ ] **Step 2: Configure CI quality gates**

CI runs on pull request and `main`: install with frozen lockfile, start Supabase, reset migrations, generate types, run unit/integration tests, lint, typecheck, build and Playwright. Cache pnpm store; always stop local Supabase in cleanup.

Use this job order in `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm db:start
      - run: pnpm db:reset
      - run: pnpm db:types
      - run: git diff --exit-code src/lib/supabase/database.types.ts
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test:e2e
      - if: always()
        run: pnpm supabase stop --no-backup
```

- [ ] **Step 3: Configure Vercel/Supabase production**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"]
}
```

Create separate Supabase projects for preview and production in Singapore. Configure private storage bucket, Auth phone/password settings, redirect URLs, Vercel secrets and custom domain. Never copy production service-role keys into preview.

- [ ] **Step 4: Document backup and restore drill**

`backup-restore.md` specifies daily managed backup, weekly application export, monthly restore drill into a non-production project, responsible manager, expected recovery checks and evidence location. The drill verifies users, source rows, stock balance, receivables and one XLSX report.

- [ ] **Step 5: Document clean cutover from Excel**

`cutover.md` requires a signed cutoff date and only these opening inputs: users, customers, machines, opening finished-stock bags, customer debt, settings. Each balance records preparer, approver and source note. Keep `QL.xlsx` read-only for reference; do not import its transactions or formulas.

- [ ] **Step 6: Run complete verification**

Run:

```powershell
pnpm db:reset
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
node scripts/verify-env.mjs
```

Expected: every command exits 0; full-day test matches the exact acceptance totals above.

- [ ] **Step 7: Deploy preview and run smoke checks**

Run the preview deployment, then `node scripts/smoke-production.mjs <preview-url>`. The smoke script checks HTTPS, login page, manifest, service worker, authenticated health query and Singapore-backed API response without modifying production data.

- [ ] **Step 8: Commit**

```powershell
git add .github vercel.json docs/operations scripts tests/e2e/full-day.spec.ts README.md .env.example
git commit -m "chore: add deployment and cutover runbooks"
```

## Final Verification Checklist

- [ ] `pnpm db:reset` applies every migration from zero without manual SQL.
- [ ] `pnpm db:types` produces no uncommitted diff.
- [ ] `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck` and `pnpm build` all exit 0.
- [ ] Phone/PIN login, employee ownership rules and manager-only actions are covered by tests.
- [ ] Wholesale and retail revenue derive only from quantity × unit price lines.
- [ ] Partial/multiple receipts reconcile to receivables and cannot over-allocate.
- [ ] Production detail and shift totals never double count stock.
- [ ] Sales concurrency cannot oversell when negative stock is disabled.
- [ ] Pending expenses do not reduce official profit; approved expenses do.
- [ ] Locking freezes all domain writes; reopening requires and audits a reason.
- [ ] Mobile pages have no horizontal overflow at 360 px; desktop tables work at 1440 px.
- [ ] Excel totals match dashboard queries and locked snapshots.
- [ ] Audit log is append-only and contains no authentication secrets.
- [ ] Preview runs in Vercel `sin1`; Supabase projects are in Singapore.
- [ ] Backup restore drill and clean-start cutover have named owners before go-live.

## Requirement Traceability

| Design requirement | Implemented by |
|---|---|
| PWA responsive trên điện thoại và máy tính | Tasks 1, 3, 12, 15 |
| Tài khoản riêng, phone/PIN, hai vai trò | Tasks 2, 3, 14 |
| Danh mục khách hàng và máy | Task 5 |
| Bán sỉ, bán lẻ nhiều mức giá | Task 6 |
| Bán chịu, trả một phần/nhiều lần, tuổi nợ | Tasks 7, 12 |
| Sản xuất từng mẻ và tổng cuối ca không tính trùng | Task 8 |
| Tồn thành phẩm theo bao, kiểm kê và cảnh báo 5% | Tasks 9, 11, 12 |
| Chi phí có chứng từ và duyệt | Task 10 |
| Khóa/mở ngày 00:00–23:59 Asia/Bangkok | Tasks 4, 11 |
| Dashboard ngày/tháng và cảnh báo | Task 12 |
| Excel và xuất dữ liệu dự phòng | Task 13 |
| Sửa/hủy an toàn và lịch sử thay đổi | Tasks 2, 14 |
| Atomicity, idempotency, chống oversell/xung đột | Tasks 4, 6, 7, 9, 14 |
| RLS, storage riêng tư, không lộ bí mật | Tasks 2, 3, 10, 15 |
| Vercel/Supabase Singapore, backup và cutover sạch | Task 15 |
