# Daily Production Loss Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy stock-count workflow with an auditable daily production-loss reconciliation and make every operational module use one 20:00–20:00 Asia/Bangkok business day.

**Architecture:** A shared TypeScript/SQL day-boundary contract derives `operating_day` from an actual occurrence timestamp. Supabase owns aggregation, loss calculation, concurrency, warning confirmation, and closing checks; Next.js owns validation, mobile-first presentation, and server actions. Each saved reconciliation snapshots its production/sales inputs and writes an immutable version so source changes can invalidate stale results without rewriting history.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Supabase Postgres/Auth/RLS/RPC, Vitest, Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-05-daily-production-loss-design.md`

## Global Constraints

- Business time zone is exactly `Asia/Bangkok`.
- An operating day `D` is the half-open interval `[D 20:00, D+1 20:00)`; an event at exactly 20:00 belongs to the new day.
- The same operating day applies to production, sales, receipts, receivables, expenses, loss reconciliation, reporting, and closing after the configured cutover.
- Fast entry uses server current time by default; an optional actual occurrence time supports late entry.
- Quantities are integer bags; no other finished-product unit or SKU is introduced.
- Production totals come from harvests by `harvested_at`; later quantity entry never changes the harvest operating day.
- Sales totals include active wholesale and retail quantities regardless of payment status and exclude cancelled sales.
- No non-sale stock issue workflow is added.
- The first post-cutover day accepts a manual opening balance; later openings inherit the previous locked closing balance.
- Warning threshold defaults to exactly `5%` and applies to the absolute loss/surplus rate.
- Existing `stock_counts` and `inventory_ledger` data remain untouched, hidden from the new UI, and excluded from the new formula.
- All database mutations enforce active-user checks, RLS, idempotency, expected-version concurrency, and locked-day checks.
- `.env.local` and Supabase/Vercel secret values must never be staged or printed.

## File Structure

### New database migrations

- `supabase/migrations/20260906100000_unified_20h_operating_day.sql`: SQL day mapping, cutover setting, occurrence timestamps, and 20:00 production boundary.
- `supabase/migrations/20260906101000_daily_loss_schema.sql`: loss report tables, immutable versions, indexes, grants, RLS, and mutation guards.
- `supabase/migrations/20260906102000_daily_loss_rpcs.sql`: source snapshots, save/read/history/confirm RPCs, audit writes, and stale detection.
- `supabase/migrations/20260906090030_daily_loss_closing.sql`: unified closing/reopening and synchronized production-day lock state.
- `supabase/migrations/20260906091603_daily_loss_dashboard.sql`: dashboard view and report-facing loss fields.
- `supabase/migrations/20260906092257_daily_loss_dashboard_confirmation.sql`: dashboard review-state correction after manager confirmation.

### New application units

- `src/modules/shared/occurred-at.ts`: converts optional Bangkok `datetime-local` input to an ISO timestamp.
- `src/modules/shared/document-time.ts`: validates and submits audited occurrence-time corrections.
- `src/components/forms/occurred-at-field.tsx`: collapsed current-time control with an optional actual-time field.
- `src/components/forms/correct-occurred-at-dialog.tsx`: creator/manager correction dialog for unlocked transactions.
- `src/modules/loss/schema.ts`: loss input validation and pure calculation helpers.
- `src/modules/loss/types.ts`: stable loss report, history, status, and RPC response types.
- `src/modules/loss/repository.ts`: Supabase queries and RPC calls.
- `src/modules/loss/service.ts`: validation, result parsing, and user-facing error mapping.
- `src/modules/loss/actions.ts`: authenticated server actions and path revalidation.
- `src/components/loss/loss-summary.tsx`: calculation cards and accessible status styling.
- `src/components/loss/loss-history.tsx`: responsive history list/table.
- `src/components/loss/loss-version-history.tsx`: manager-only before/after version history.
- `src/components/forms/daily-loss-form.tsx`: opening/closing entry, save, and warning feedback.
- `src/app/(app)/loss/page.tsx`: current operating-day reconciliation screen.
- `src/app/(app)/loss/[day]/page.tsx`: historical day detail.
- `src/app/api/reports/loss/route.ts`: Excel loss-detail export.

### Existing units changed

- Shared day and production boundaries: `src/modules/shared/operating-day.ts`, `src/modules/production/production-day.ts`, and their tests.
- Transaction occurrence time: sales, receivables, and expenses schemas/forms/RPC-backed modules.
- Production controls: remove the 18:00–20:00 start prohibition and separate production-day locking.
- Closing: replace stock-count checks with loss-report completeness/freshness/confirmation checks.
- Navigation/dashboard/reporting: replace inventory labels and metrics with loss reconciliation.
- Generated types and seeds: include the new columns, tables, functions, and test fixtures.

---

### Task 1: Establish the shared 20:00–20:00 day contract

**Files:**
- Modify: `src/modules/shared/operating-day.ts:1-21`
- Modify: `src/modules/shared/operating-day.test.ts:1-12`
- Modify: `src/modules/production/production-day.ts:1-72`
- Modify: `src/modules/production/production-day.test.ts:1-33`
- Modify: `src/components/production/machine-production-card.tsx:1-32`
- Modify: `src/modules/production/production.integration.test.ts`
- Modify: `src/app/(app)/production/page.tsx`
- Test: `src/modules/shared/operating-day.test.ts`
- Test: `src/modules/production/production-day.test.ts`

**Interfaces:**
- Produces: `getOperatingDay(now: Date): string`.
- Produces: `getOperatingWindow(day: string): { startsAt: Date; endsAt: Date }`.
- Produces compatibility aliases `getProductionDate` and `getProductionWindow` backed by the shared implementation.
- Removes business use of `canStartMachine`; machine-state rules, not clock time, decide whether Start is enabled.

- [x] **Step 1: Replace the calendar-day tests with boundary tests**

```ts
it('maps Bangkok time before 20:00 to the previous operating day', () => {
  expect(getOperatingDay(new Date('2026-09-06T12:59:59.999Z'))).toBe('2026-09-05')
})

it('maps exactly 20:00 Bangkok time to the new operating day', () => {
  expect(getOperatingDay(new Date('2026-09-06T13:00:00.000Z'))).toBe('2026-09-06')
})

it('creates a 24-hour operating window', () => {
  expect(getOperatingWindow('2026-09-05')).toEqual({
    startsAt: new Date('2026-09-05T13:00:00.000Z'),
    endsAt: new Date('2026-09-06T13:00:00.000Z'),
  })
})
```

- [x] **Step 2: Run the focused tests and verify the old behavior fails**

Run:

```powershell
corepack pnpm vitest run src/modules/shared/operating-day.test.ts src/modules/production/production-day.test.ts
```

Expected: failures at the pre-20:00 mapping and the old 18:00 production end.

- [x] **Step 3: Implement the shared day and window functions**

Use Bangkok date/hour parts, subtract one UTC calendar day when the local hour is below 20, and return these exact window boundaries:

```ts
export function getOperatingDay(now: Date): string {
  const { year, month, day, hour } = getBangkokParts(now)
  return hour >= 20
    ? formatUtcDate(year, month, day)
    : formatUtcDate(year, month, day - 1)
}

export function getOperatingWindow(day: string) {
  const parsed = parseOperatingDay(day)
  return {
    startsAt: new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 13)),
    endsAt: new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1, 13)),
  }
}
```

Make `production-day.ts` re-export aliases rather than maintaining a second boundary implementation:

```ts
export {
  BUSINESS_TIME_ZONE,
  getOperatingDay as getProductionDate,
  getOperatingWindow as getProductionWindow,
} from '@/modules/shared/operating-day'
```

- [x] **Step 4: Remove the UI-only 18:00–20:00 Start disablement**

Delete the `canStartMachine` import, `startWindow`, and the `Không thể bắt đầu máy trong khoảng 18:00–20:00` branch. Keep the existing machine-running, locked-day, and disconnected-state reasons.

- [x] **Step 5: Run unit tests, lint, and type checking**

Run:

```powershell
corepack pnpm vitest run src/modules/shared/operating-day.test.ts src/modules/production/production-day.test.ts src/components/production/machine-production-card.test.tsx
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all commands exit `0`.

- [x] **Step 6: Commit Task 1**

```powershell
git add src/modules/shared/operating-day.ts src/modules/shared/operating-day.test.ts src/modules/production/production-day.ts src/modules/production/production-day.test.ts src/components/production/machine-production-card.tsx
git commit -m 'feat: unify operating day at 20h'
```

---

### Task 2: Persist actual occurrence time for business transactions

**Files:**
- Create: `supabase/migrations/20260906055800_unified_20h_operating_day.sql`
- Create: `src/modules/shared/occurred-at.ts`
- Create: `src/modules/shared/occurred-at.test.ts`
- Create: `src/modules/shared/document-time.ts`
- Create: `src/modules/shared/document-time.test.ts`
- Create: `src/modules/shared/document-time-actions.ts`
- Create: `src/components/forms/occurred-at-field.tsx`
- Create: `src/components/forms/occurred-at-field.test.tsx`
- Create: `src/components/forms/correct-occurred-at-dialog.tsx`
- Create: `src/components/forms/correct-occurred-at-dialog.test.tsx`
- Modify: `src/modules/sales/schema.ts:23-98`
- Modify: `src/modules/sales/types.ts:3-18`
- Modify: `src/modules/sales/repository.ts:8-44`
- Modify: `src/modules/receivables/schema.ts:12-54`
- Modify: `src/modules/receivables/types.ts:28-43`
- Modify: `src/modules/receivables/repository.ts:93-121`
- Modify: `src/modules/expenses/schema.ts:3-22`
- Modify: `src/modules/expenses/types.ts:3-20`
- Modify: `src/modules/expenses/repository.ts:52-82`
- Modify: `src/components/forms/wholesale-sale-form.tsx`
- Modify: `src/components/forms/retail-sale-form.tsx`
- Modify: `src/components/forms/receipt-form.tsx`
- Modify: `src/components/forms/expense-form.tsx`
- Modify: `src/app/(app)/sales/page.tsx`
- Modify: `src/app/(app)/receivables/[customerId]/page.tsx`
- Modify: `src/app/(app)/expenses/page.tsx`
- Modify: `src/modules/sales/create-sale.integration.test.ts`
- Modify: `src/modules/receivables/record-receipt.integration.test.ts`
- Modify: `src/modules/expenses/expense.integration.test.ts`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces SQL `private.operating_day_at(p_at timestamptz): date`.
- Produces public `correct_document_occurred_at(p_entity_type text, p_entity_id uuid, p_expected_version integer, p_occurred_at timestamptz, p_idempotency_key uuid): jsonb`.
- Adds non-null `occurred_at timestamptz` to `sales`, `receipts`, and `expenses`.
- Adds `settings.operating_day_cutover_at timestamptz` and `settings.loss_warning_pct numeric(5,2) default 5`.
- Produces `parseBangkokOccurredAt(value: FormDataEntryValue | null): string | null`.
- Adds `occurredAt` to sale, receipt, and expense list items so the correction UI displays the real occurrence time rather than `createdAt`.
- Adds `occurredAt?: string | null` to create-sale, record-receipt, and create-expense inputs; removes trust in client-supplied `operatingDay` for new writes.
- Removes new-sale stock checks and `inventory_ledger` writes; the archived ledger remains available only for legacy records and legacy cancellation reversal.

- [x] **Step 1: Write failing timestamp conversion tests**

```ts
it('uses server current time when the optional field is empty', () => {
  expect(parseBangkokOccurredAt('')).toBeNull()
})

it('converts a Bangkok datetime-local value to UTC ISO', () => {
  expect(parseBangkokOccurredAt('2026-09-06T19:50')).toBe('2026-09-06T12:50:00.000Z')
})

it('rejects an invalid local timestamp', () => {
  expect(() => parseBangkokOccurredAt('06/09/2026 19:50')).toThrow('Thời gian phát sinh không hợp lệ')
})
```

- [x] **Step 2: Run the conversion test and verify it fails**

```powershell
corepack pnpm vitest run src/modules/shared/occurred-at.test.ts
```

Expected: failure because the module does not exist.

- [x] **Step 3: Create the occurrence-time migration**

The migration must include these structural operations before replacing the three write RPCs:

```sql
alter table public.settings
  add column operating_day_cutover_at timestamptz,
  add column loss_warning_pct numeric(5,2) not null default 5
    check (loss_warning_pct between 0 and 100);

alter table public.sales add column occurred_at timestamptz;
update public.sales set occurred_at = created_at where occurred_at is null;
alter table public.sales alter column occurred_at set not null;

alter table public.receipts add column occurred_at timestamptz;
update public.receipts set occurred_at = created_at where occurred_at is null;
alter table public.receipts alter column occurred_at set not null;

alter table public.expenses add column occurred_at timestamptz;
update public.expenses set occurred_at = created_at where occurred_at is null;
alter table public.expenses alter column occurred_at set not null;

create index sales_operating_day_occurred_at_idx
  on public.sales (operating_day, occurred_at desc);
create index receipts_operating_day_occurred_at_idx
  on public.receipts (operating_day, occurred_at desc);
create index expenses_operating_day_occurred_at_idx
  on public.expenses (operating_day, occurred_at desc);

create or replace function private.operating_day_at(p_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when (p_at at time zone 'Asia/Bangkok')::time >= time '20:00'
      then (p_at at time zone 'Asia/Bangkok')::date
    else (p_at at time zone 'Asia/Bangkok')::date - 1
  end
$$;
```

For `public.create_sale`, `public.record_receipt`, and `public.create_expense`, preserve all current validations and atomic side effects but replace client day parsing with:

```sql
v_occurred_at := coalesce(
  nullif(p_input->>'occurredAt', '')::timestamptz,
  statement_timestamp()
);
v_day := private.operating_day_at(v_occurred_at);
perform private.require_open_day(v_day);
```

Require `settings.operating_day_cutover_at` to be configured and reject a new event whose actual timestamp precedes it with `OCCURRED_AT_BEFORE_CUTOVER`. Insert `v_occurred_at` into each new column. Keep old rows and their stored `operating_day` unchanged. Set the cutover timestamp only during the Dev/Production cutover task, not automatically during migration application.

Replace `create_sale` without its `pg_advisory_xact_lock` stock-balance query, `INSUFFICIENT_STOCK` branch, or sale insert into `inventory_ledger`. Preserve sale lines, receivables, source-sale receipts, idempotency, totals, and audit behavior. Do not delete or backfill legacy ledger rows. Existing cancellation may create a reversal only when its legacy sale ledger row exists; a post-cutover sale without such a row must cancel successfully without a reversal.

Also replace production-day SQL boundaries from next-day `18:00` to next-day `20:00`, remove both `START_OUTSIDE_PRODUCTION_HOURS` guards, and make `private.production_date_at` delegate to `private.operating_day_at`. Harden `correct_production_action`: a change to run/harvest time must derive its original and destination days, lock both day rows in sorted order, and reject when either day is locked. Harvest corrections may cross a 20:00 boundary without changing the run's start-day ownership because loss aggregation uses `harvested_at` directly.

- [x] **Step 4: Implement the collapsed time control**

`OccurredAtField` renders a checked `Dùng giờ hiện tại` control by default. When unchecked, it renders a required `datetime-local` input named `occurredAt`. Implement `parseBangkokOccurredAt` with the exact accepted pattern `YYYY-MM-DDTHH:mm` and append `:00+07:00` before converting to ISO.

Each form passes `null` for fast entry and the parsed ISO value for late entry:

```ts
occurredAt: parseBangkokOccurredAt(formData.get('occurredAt')),
```

Do not send `operatingDay` as an authority for new transactions; the database derives it from `occurredAt` or server time.

- [x] **Step 5: Add audited corrections for saved transaction times**

Implement `correct_document_occurred_at` for `sale`, `receipt`, and `expense`. It must lock the target row, require the creator or a manager, require matching `expectedVersion`, require both the original and destination operating days to be open, reject timestamps before cutover, update `occurred_at`, derive the destination day in SQL, increment the document version, and write the full before/after image to `audit_log`. Reusing an idempotency key returns the first result.

For a sale correction, atomically move its receivable to the same operating day, recalculate the receivable due date from the active customer's payment term, and move the auto-created `source_sale_id` receipt to the same timestamp/day. A manually recorded receipt keeps its own occurrence time. A failed child update rolls back the whole correction.

Add `CorrectOccurredAtDialog` beside the existing cancel control on sales, customer receipt history, and expenses. Show it only while the document is active and the current user is its creator or a manager. The dialog displays the current Bangkok time, accepts `datetime-local`, sends a new idempotency key, and maps `DAY_LOCKED`, `VERSION_CONFLICT`, `OCCURRED_AT_BEFORE_CUTOVER`, and `FORBIDDEN` to specific Vietnamese messages.

`document-time-actions.ts` requires an active user, calls the typed service, and revalidates `/`, `/sales`, `/receivables`, `/expenses`, `/loss`, `/closing`, `/alerts`, and `/admin/audit` after success. Update repository selects and list-item mappers to return `occurred_at`. Update the generated database types in the same task so the new RPC and columns compile before later regeneration verifies them against Supabase Dev.

- [x] **Step 6: Add integration assertions at the 20:00 boundary and stock-ledger cutover**

Set the test cutover to `2026-09-05T13:00:00Z`. For each transaction RPC, create one fixture at `2026-09-06T12:59:59.999Z` and one at `2026-09-06T13:00:00.000Z`. Assert `operating_day` is `2026-09-05` for the first and `2026-09-06` for the second. Assert a timestamp targeting a locked day returns `DAY_LOCKED` and a timestamp before cutover returns `OCCURRED_AT_BEFORE_CUTOVER`.

Assert post-cutover sales succeed with zero legacy ledger balance, create no `inventory_ledger` row, still create receivable/source receipt records correctly, and can be cancelled without a ledger reversal. Assert correcting each document moves it to the derived open day, writes an audit entry, rejects a stale version, and refuses to move into or out of a locked day.

- [x] **Step 7: Run focused unit/integration tests**

```powershell
corepack pnpm vitest run src/modules/shared/occurred-at.test.ts src/modules/shared/document-time.test.ts src/components/forms/occurred-at-field.test.tsx src/components/forms/correct-occurred-at-dialog.test.tsx src/modules/sales/schema.test.ts src/modules/sales/create-sale.integration.test.ts src/modules/receivables/record-receipt.integration.test.ts src/modules/expenses/expense.integration.test.ts
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all enabled tests pass; integration suites skip only when their documented Supabase test variables are absent.

- [x] **Step 8: Commit Task 2**

```powershell
git add supabase/migrations/20260906055800_unified_20h_operating_day.sql src/modules/shared/occurred-at.ts src/modules/shared/occurred-at.test.ts src/modules/shared/document-time.ts src/modules/shared/document-time.test.ts src/modules/shared/document-time-actions.ts src/components/forms/occurred-at-field.tsx src/components/forms/occurred-at-field.test.tsx src/components/forms/correct-occurred-at-dialog.tsx src/components/forms/correct-occurred-at-dialog.test.tsx src/modules/sales src/modules/receivables src/modules/expenses src/modules/production/service.ts src/components/forms/wholesale-sale-form.tsx src/components/forms/retail-sale-form.tsx src/components/forms/receipt-form.tsx src/components/forms/expense-form.tsx 'src/app/(app)/sales/page.tsx' 'src/app/(app)/sales/new/retail/page.tsx' 'src/app/(app)/sales/new/wholesale/page.tsx' 'src/app/(app)/receivables/[customerId]/page.tsx' 'src/app/(app)/expenses/page.tsx' 'src/app/(app)/expenses/new/page.tsx' src/lib/supabase/database.types.ts
git commit -m 'feat: record actual transaction time'
```

---

### Task 3: Define the daily loss domain and database schema

**Files:**
- Create: `supabase/migrations/20260906061436_daily_loss_schema.sql`
- Create: `src/modules/loss/schema.ts`
- Create: `src/modules/loss/schema.test.ts`
- Create: `src/modules/loss/types.ts`

**Interfaces:**
- Produces enum `public.loss_classification`: `matched | loss | surplus | no_production`.
- Produces tables `public.daily_loss_reports` and `public.daily_loss_report_versions`.
- Produces `calculateDailyLoss(input): DailyLossCalculation`.
- Produces `dailyLossInputSchema` with `operatingDay`, optional first-day `openingBags`, required `closingBags`, optional `note`, optional `expectedVersion`, and `idempotencyKey`.

- [x] **Step 1: Write failing formula and validation tests**

```ts
it('calculates a positive loss against production', () => {
  expect(calculateDailyLoss({ openingBags: 100, producedBags: 500, soldBags: 450, closingBags: 140, warningPct: 5 })).toEqual({
    differenceBags: 10,
    differencePct: '2',
    classification: 'loss',
    requiresReview: false,
  })
})

it('labels a negative difference as surplus', () => {
  expect(calculateDailyLoss({ openingBags: 0, producedBags: 500, soldBags: 450, closingBags: 60, warningPct: 5 })).toEqual({
    differenceBags: -10,
    differencePct: '2',
    classification: 'surplus',
    requiresReview: false,
  })
})

it('does not invent a percentage when production is zero', () => {
  expect(calculateDailyLoss({ openingBags: 10, producedBags: 0, soldBags: 2, closingBags: 7, warningPct: 5 })).toEqual({
    differenceBags: 1,
    differencePct: null,
    classification: 'no_production',
    requiresReview: true,
  })
})
```

- [x] **Step 2: Run the loss-domain test and verify it fails**

```powershell
corepack pnpm vitest run src/modules/loss/schema.test.ts
```

Expected: failure because the loss module does not exist.

- [x] **Step 3: Implement the pure domain calculation**

Use `decimal.js` for the rate and return a signed bag difference:

```ts
export function calculateDailyLoss(input: DailyLossCalculationInput): DailyLossCalculation {
  const differenceBags = input.openingBags + input.producedBags - input.soldBags - input.closingBags
  const differencePct = input.producedBags === 0
    ? null
    : new Decimal(Math.abs(differenceBags)).div(input.producedBags).times(100).toDecimalPlaces(3).toString()
  const classification = input.producedBags === 0
    ? 'no_production'
    : differenceBags > 0
      ? 'loss'
      : differenceBags < 0
        ? 'surplus'
        : 'matched'

  return {
    differenceBags,
    differencePct,
    classification,
    requiresReview: differencePct === null ? differenceBags !== 0 : new Decimal(differencePct).greaterThan(input.warningPct),
  }
}
```

- [x] **Step 4: Create loss report and immutable-version tables**

The migration must define this shape and equivalent checks:

```sql
create type public.loss_classification as enum ('matched', 'loss', 'surplus', 'no_production');

create table public.daily_loss_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  operating_day date not null unique references public.operating_days(day) on delete restrict,
  opening_bags bigint not null check (opening_bags between 0 and 10000000),
  produced_bags bigint not null check (produced_bags between 0 and 10000000),
  sold_bags bigint not null check (sold_bags between 0 and 10000000),
  closing_bags bigint not null check (closing_bags between 0 and 10000000),
  difference_bags bigint not null,
  difference_pct numeric(12,3),
  classification public.loss_classification not null,
  warning_pct numeric(5,2) not null check (warning_pct between 0 and 100),
  requires_review boolean not null,
  source_snapshot jsonb not null,
  version integer not null default 1 check (version > 0),
  note text check (note is null or length(note) <= 1000),
  warning_confirmed_by uuid references public.profiles(id) on delete restrict,
  warning_confirmed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((warning_confirmed_by is null) = (warning_confirmed_at is null))
);

create table public.daily_loss_report_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid not null references public.daily_loss_reports(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (report_id, version)
);
```

Add indexes on report day/update time and version report/time. Enable RLS on both tables. The report table gets an active-user `SELECT` policy; the version table gets a manager-only `SELECT` policy using `private.is_manager()`. Grant `SELECT` to `authenticated`, revoke direct authenticated mutations, grant `service_role` full access, and expose writes only through RPCs. Add a statement-level trigger that rejects `UPDATE`/`DELETE` on the version table even when called by a privileged application path. Verify an employee receives zero version rows rather than relying only on the page to hide them.

- [x] **Step 5: Run domain tests and SQL lint checks**

```powershell
corepack pnpm vitest run src/modules/loss/schema.test.ts
corepack pnpm exec supabase db lint --local
corepack pnpm lint
corepack pnpm typecheck
```

Expected: loss tests pass; database lint either passes against a running local Supabase stack or reports only that the local stack is unavailable.

- [x] **Step 6: Commit Task 3**

```powershell
git add supabase/migrations/20260906061436_daily_loss_schema.sql src/modules/loss/schema.ts src/modules/loss/schema.test.ts src/modules/loss/types.ts
git commit -m 'feat: define daily loss reports'
```

---

### Task 4: Implement transactional loss reconciliation RPCs

**Files:**
- Create: `supabase/migrations/20260906081150_daily_loss_rpcs.sql`
- Create: `src/modules/loss/daily-loss.integration.test.ts`
- Create: `src/modules/loss/concurrency.integration.test.ts`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces private `private.daily_loss_source_snapshot(p_day date): jsonb`.
- Produces public `get_daily_loss_report(p_day date): jsonb`.
- Produces public `save_daily_loss_report(p_input jsonb, p_idempotency_key uuid): jsonb`.
- Produces public `confirm_daily_loss_warning(p_report_id uuid, p_expected_version integer): jsonb`.
- Source snapshot keys are `producedBags`, `soldBags`, `pendingHarvestCount`, `productionFingerprint`, and `salesFingerprint`.
- Save response includes report fields plus `isStale`, `pendingHarvestCount`, `canFinalize`, and `versions` only when requested from the manager history query.

- [x] **Step 1: Write a failing end-to-end database fixture**

Create one open operating day, a previous locked report with `closing_bags = 100`, two harvests totalling `500`, and active sale lines totalling `450`. Save closing stock `140` and assert:

```ts
expect(result).toMatchObject({
  operatingDay: day,
  openingBags: 100,
  producedBags: 500,
  soldBags: 450,
  closingBags: 140,
  differenceBags: 10,
  differencePct: '2.000',
  classification: 'loss',
  requiresReview: false,
  isStale: false,
})
```

Add cases for first-day manual opening, cancelled sales, a pending harvest quantity, zero production, a `6%` loss, and a second save with `expectedVersion`.

- [x] **Step 2: Run the database integration test and verify it fails**

```powershell
$env:RUN_SUPABASE_INTEGRATION='true'
corepack pnpm vitest run src/modules/loss/daily-loss.integration.test.ts
Remove-Item Env:RUN_SUPABASE_INTEGRATION
```

Expected: failure because the RPCs are absent.

- [x] **Step 3: Build an authoritative source snapshot**

The private function must aggregate harvest quantity by the harvest operating day and active sales by stored `operating_day`. Use ordered JSON fingerprints so edits that preserve the same total are still detectable:

```sql
select coalesce(sum(h.bag_quantity), 0),
       count(*) filter (where h.bag_quantity is null),
       md5(coalesce(jsonb_agg(
         jsonb_build_array(h.id, h.harvested_at, h.bag_quantity, h.quantity_updated_at)
         order by h.id
       )::text, '[]'))
from public.machine_harvests h
where private.operating_day_at(h.harvested_at) = p_day;

select coalesce(sum(sl.quantity_bags), 0),
       md5(coalesce(jsonb_agg(
         jsonb_build_array(s.id, s.version, s.status, sl.line_number, sl.quantity_bags)
         order by s.id, sl.line_number
       )::text, '[]'))
from public.sales s
join public.sale_lines sl on sl.sale_id = s.id
where s.operating_day = p_day
  and s.status = 'active';
```

Return all five documented keys. Do not read `inventory_ledger` or `stock_counts`.

- [x] **Step 4: Implement the save RPC as one transaction**

The function must perform these checks in order:

1. Validate active user, JSON shape, day, integer opening/closing bounds, note length, and expected version.
2. Call `private.require_open_day(v_day)`.
3. Claim the idempotency key for operation `save_daily_loss_report`.
4. Acquire `pg_advisory_xact_lock(hashtextextended('daily_loss:' || v_day::text, 0))`.
5. Load the previous day report and require its operating day to be locked, except on the configured first cutover day.
6. Use previous closing as opening, or require manual opening on the first day.
7. Call `private.daily_loss_source_snapshot` and calculate the signed difference/rate/classification using the approved formula.
8. Insert or update the current report only when `expectedVersion` matches.
9. Clear warning confirmation whenever any report field changes.
10. Insert the full after-image into `daily_loss_report_versions` and write `daily_loss.created` or `daily_loss.updated` through `private.write_audit`.
11. Complete and return the idempotent response.

Return `VERSION_CONFLICT` with SQLSTATE `PT409` when the expected version is stale. A pending harvest does not prevent saving a draft; it sets `canFinalize` to false.

- [x] **Step 5: Implement read-time stale detection**

`get_daily_loss_report` must recompute the current source snapshot and compare it with `daily_loss_reports.source_snapshot`:

```sql
v_is_stale := v_report.source_snapshot is distinct from v_current_source;
```

Return an empty draft with inherited opening/current source totals when no report exists. Return `previousDayReady = false` when the prior report/day is not locked.

- [x] **Step 6: Implement manager warning confirmation**

Require `private.is_manager()`, an open day, matching `expectedVersion`, `requires_review = true`, no stale source snapshot, and no pending harvest. Set `warning_confirmed_by`, `warning_confirmed_at`, increment the report version, append a version snapshot, and write `daily_loss.warning_confirmed` to `audit_log`. Do not request or store a reason.

- [x] **Step 7: Prove idempotency and concurrent-edit safety**

Run two saves with the same idempotency key and assert one report version. Then run two different saves with the same `expectedVersion`; assert exactly one succeeds and the other returns `VERSION_CONFLICT`.

- [x] **Step 8: Run integration tests**

```powershell
$env:RUN_SUPABASE_INTEGRATION='true'
corepack pnpm vitest run src/modules/loss/daily-loss.integration.test.ts src/modules/loss/concurrency.integration.test.ts
Remove-Item Env:RUN_SUPABASE_INTEGRATION
```

Expected: all test cases pass and clean up only their UUID-scoped fixtures.

- [x] **Step 9: Commit Task 4**

```powershell
git add supabase/migrations/20260906081150_daily_loss_rpcs.sql supabase/seed.sql src/modules/loss/daily-loss.integration.test.ts src/modules/loss/concurrency.integration.test.ts src/lib/supabase/database.types.ts
git commit -m 'feat: reconcile daily production loss'
```

---

### Task 5: Add the loss application module and server actions

**Files:**
- Create: `src/modules/loss/repository.ts`
- Create: `src/modules/loss/repository.test.ts`
- Create: `src/modules/loss/service.ts`
- Create: `src/modules/loss/service.test.ts`
- Create: `src/modules/loss/actions.ts`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces `getDailyLossReport(day, client?): Promise<ActionResult<DailyLossReport>>`.
- Produces `saveDailyLoss(input, client?): Promise<ActionResult<DailyLossReport>>`.
- Produces `confirmDailyLossWarning(input, client?): Promise<ActionResult<DailyLossReport>>`.
- Produces `listDailyLossReports(client, limit?): Promise<DailyLossHistoryItem[]>`.
- Server actions are `refreshDailyLoss`, `saveDailyLossAction`, and `confirmDailyLossWarningAction`.

- [x] **Step 1: Define the stable report type and parser contract**

Use these externally visible fields:

```ts
export type DailyLossReport = {
  id: string | null
  operatingDay: string
  openingBags: number | null
  producedBags: number
  soldBags: number
  expectedClosingBags: number | null
  closingBags: number | null
  differenceBags: number | null
  differencePct: string | null
  classification: 'matched' | 'loss' | 'surplus' | 'no_production' | null
  warningPct: string
  requiresReview: boolean
  warningConfirmedAt: string | null
  version: number | null
  isStale: boolean
  pendingHarvestCount: number
  previousDayReady: boolean
  status: 'open' | 'locked'
  note: string | null
}
```

- [x] **Step 2: Write failing service tests**

Cover invalid bag counts, `VERSION_CONFLICT`, `DAY_LOCKED`, missing prior close, stale report, forbidden warning confirmation, malformed RPC response, and success parsing. Assert Vietnamese messages identify the cause rather than returning a generic database message.

- [x] **Step 3: Run the tests and verify they fail**

```powershell
corepack pnpm vitest run src/modules/loss/repository.test.ts src/modules/loss/service.test.ts
```

Expected: failure because repository/service modules are absent.

- [x] **Step 4: Implement repository calls**

```ts
export function getDailyLossReportRecord(client: LossClient, day: string) {
  return client.rpc('get_daily_loss_report', { p_day: day })
}

export function saveDailyLossRecord(client: LossClient, input: DailyLossInput) {
  return client.rpc('save_daily_loss_report', {
    p_input: {
      operatingDay: input.operatingDay,
      openingBags: input.openingBags,
      closingBags: input.closingBags,
      note: input.note,
      expectedVersion: input.expectedVersion,
    },
    p_idempotency_key: input.idempotencyKey,
  })
}
```

List history from `daily_loss_reports` ordered by `operating_day desc`. Load manager version history from `daily_loss_report_versions` and join `profiles(full_name)` for the editor label.

- [x] **Step 5: Implement service validation and error mapping**

Map at least these database codes/messages:

```ts
const errors = {
  DAY_LOCKED: 'Ngày vận hành đã khóa.',
  PREVIOUS_DAY_NOT_READY: 'Ngày trước chưa khóa nên chưa xác định được tồn đầu.',
  VERSION_CONFLICT: 'Kết quả vừa được người khác cập nhật. Vui lòng tải lại.',
  LOSS_REPORT_STALE: 'Số liệu sản xuất hoặc bán hàng đã thay đổi. Vui lòng kiểm tra và lưu lại.',
  PENDING_HARVEST_QUANTITY: 'Còn lần xả đá chưa nhập số bao.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
} as const
```

Parse every RPC response with Zod before returning `actionSuccess`.

- [x] **Step 6: Implement authenticated actions and revalidation**

`saveDailyLossAction` requires any active user. Warning confirmation requires a manager. Successful writes revalidate `/`, `/loss`, `/closing`, `/alerts`, the affected loss day, and the affected closing day.

- [x] **Step 7: Regenerate and inspect database types**

```powershell
corepack pnpm db:types
git diff -- src/lib/supabase/database.types.ts
```

Expected: types include all new settings columns, occurrence columns, loss tables, enum, and RPC signatures; no production project reference appears in generated output.

- [x] **Step 8: Run module tests and static checks**

```powershell
corepack pnpm vitest run src/modules/loss
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all commands exit `0`.

- [x] **Step 9: Commit Task 5**

```powershell
git add src/modules/loss src/lib/supabase/database.types.ts
git commit -m 'feat: add daily loss application module'
```

---

### Task 6: Replace the inventory UI with daily loss reconciliation

**Files:**
- Create: `src/components/loss/loss-summary.tsx`
- Create: `src/components/loss/loss-summary.test.tsx`
- Create: `src/components/loss/loss-history.tsx`
- Create: `src/components/loss/loss-version-history.tsx`
- Create: `src/components/forms/daily-loss-form.tsx`
- Create: `src/components/forms/daily-loss-form.test.tsx`
- Create: `src/app/(app)/loss/page.tsx`
- Create: `src/app/(app)/loss/[day]/page.tsx`
- Modify: `src/app/(app)/inventory/page.tsx:1-22`
- Modify: `src/app/(app)/inventory/count/page.tsx:1-14`
- Modify: `src/components/app-shell/desktop-sidebar.tsx:58-66`
- Modify: `src/components/dashboard/quick-actions.tsx:3-8`
- Modify: `src/components/app-shell/mobile-nav.tsx:5-72`
- Test: `tests/e2e/loss.spec.ts`

**Interfaces:**
- `/loss` displays the current operating-day report and recent history.
- `/loss/[day]` displays a historical/current day; managers also receive version history.
- `/inventory` and `/inventory/count` redirect to `/loss` and do not expose the legacy ledger UI.

- [x] **Step 1: Write failing component tests**

Assert these visible states:

```ts
expect(screen.getByText('Hao hụt 10 bao')).toBeVisible()
expect(screen.getByText('Tỷ lệ 2%')).toBeVisible()
expect(screen.getByText('Dư kho 5 bao')).toBeVisible()
expect(screen.getByText('Không thể tính tỷ lệ vì chưa có sản lượng')).toBeVisible()
expect(screen.getByText('Số liệu đã thay đổi')).toBeVisible()
```

Also assert status text is present independently from color and the submit button is disabled for a locked day.

- [x] **Step 2: Run component tests and verify they fail**

```powershell
corepack pnpm vitest run src/components/loss/loss-summary.test.tsx src/components/forms/daily-loss-form.test.tsx
```

Expected: failure because the components do not exist.

- [x] **Step 3: Implement the calculation summary**

Render the approved balance equation in this order:

```text
Tồn đầu
+ Tổng sản xuất
- Tổng bán
= Tồn cuối dự kiến
```

Below it render actual closing, signed status, absolute rate, warning threshold, pending-harvest count, prior-day readiness, and stale state. Use green for matched, amber for within-threshold difference, red for over-threshold/stale/incomplete, and explicit Vietnamese status text for accessibility.

- [x] **Step 4: Implement the closing-stock form**

Only show manual `openingBags` on the configured first cutover day when no previous inherited closing exists. Always show integer `closingBags` and optional `note`. Submit `expectedVersion` and a stable idempotency key; on success rotate the key and show one of:

```text
Đã lưu. Số liệu khớp kho.
Đã lưu. Hao hụt 10 bao, tương đương 2%.
Đã lưu. Dư kho 5 bao, tương đương 1%.
Đã lưu chênh lệch; không thể tính tỷ lệ vì chưa có sản lượng.
```

Keep the entered closing value after a successful save so users can compare rather than facing an empty form.

- [x] **Step 5: Build responsive current/history pages**

Use cards on narrow screens and a table on `md` and wider. History columns are day, opening, produced, sold, closing, difference, rate, and status. The detail page calls `requireUser`; the version-history section additionally checks `requireManager` before querying sensitive audit detail.

- [x] **Step 6: Redirect legacy inventory routes and update navigation**

Use `redirect('/loss')` in both legacy pages. Change desktop label to `Hao hụt`, quick action to `Hao hụt / Nhập tồn cuối`, and add a reachable mobile loss action without increasing the fixed mobile bar beyond five primary entries; link it from the dashboard quick actions and manager menu when it is not a primary tab.

- [x] **Step 7: Add the E2E happy path**

Test employee login, current-day page, first-day opening when applicable, closing entry, computed loss, history appearance, manager version history, and legacy URL redirects.

- [x] **Step 8: Run UI tests and static checks**

```powershell
corepack pnpm vitest run src/components/loss src/components/forms/daily-loss-form.test.tsx
corepack pnpm test:e2e --grep 'hao hụt'
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all enabled tests pass and both mobile/desktop render without horizontal overflow.

- [x] **Step 9: Commit Task 6**

```powershell
git add src/components/loss src/components/forms/daily-loss-form.tsx src/components/forms/daily-loss-form.test.tsx 'src/app/(app)/loss' 'src/app/(app)/inventory' src/components/app-shell src/components/dashboard/quick-actions.tsx tests/e2e/loss.spec.ts
git commit -m 'feat: replace stock count with loss screen'
```

---

### Task 7: Unify manual closing and remove separate production-day locking

**Files:**
- Create: `supabase/migrations/20260906090030_daily_loss_closing.sql`
- Modify: `src/modules/closing/types.ts:1-50`
- Modify: `src/modules/closing/service.ts:1-92`
- Modify: `src/modules/closing/repository.ts:8-21`
- Modify: `src/modules/closing/actions.ts:1-26`
- Modify: `src/modules/closing/rules.test.ts`
- Modify: `src/modules/closing/closing.integration.test.ts`
- Modify: `src/components/closing/check-list.tsx:1-6`
- Modify: `src/components/closing/lock-day-dialog.tsx`
- Create: `src/components/closing/confirm-loss-warning-button.tsx`
- Modify: `src/app/(app)/closing/[day]/page.tsx:1-18`
- Modify: `src/components/production/production-board.tsx`
- Delete: `src/components/production/production-day-controls.tsx`
- Modify: `src/modules/production/actions.ts`
- Modify: `src/modules/production/service.ts`
- Modify: `src/modules/production/repository.ts`
- Modify: `src/modules/production/production.integration.test.ts`

**Interfaces:**
- Replaces closing checks with `MISSING_LOSS_REPORT`, `PREVIOUS_DAY_NOT_READY`, `PENDING_HARVEST_QUANTITY`, `LOSS_REPORT_STALE`, and `LOSS_REVIEW_REQUIRED` while retaining unrelated expense/document checks.
- Changes `lock_operating_day` to require only `p_day date`; warning acceptance is the separate `confirm_daily_loss_warning` action.
- Keeps `reopen_operating_day(p_day date, p_reason text)` and its required reason.
- Removes public/UI use of `lock_production_day` and `reopen_production_day`; operating-day lock/reopen synchronizes the matching `production_days` row.

- [x] **Step 1: Rewrite failing closing-rule tests**

Use this input contract:

```ts
const baseInput: ClosingCheckInput = {
  lossReportExists: true,
  previousDayReady: true,
  pendingHarvestCount: 0,
  lossReportStale: false,
  lossRequiresReview: false,
  lossWarningConfirmed: false,
  pendingExpenseCount: 0,
  unnamedCreditSaleCount: 0,
  invalidDocumentCount: 0,
}
```

Assert each missing/incomplete loss condition is a non-overridable blocker except `LOSS_REVIEW_REQUIRED`, which remains blocked until the separate manager confirmation exists. Do not expect a reason field.

- [x] **Step 2: Run closing tests and verify old stock checks fail**

```powershell
corepack pnpm vitest run src/modules/closing/rules.test.ts src/modules/closing/closing.integration.test.ts
```

Expected: failures refer to `MISSING_STOCK_COUNT`, `STOCK_VARIANCE`, or old RPC shape.

- [x] **Step 3: Replace the reconciliation/lock SQL**

`get_daily_reconciliation` must join the loss report response and expose these totals:

```ts
type DailyTotals = {
  wholesaleRevenueVnd: number
  retailRevenueVnd: number
  revenueVnd: number
  soldBags: number
  collectedVnd: number
  newDebtVnd: number
  productionBags: number
  approvedExpenseVnd: number
  pendingExpenseVnd: number
  openingBags: number | null
  expectedClosingBags: number | null
  closingBags: number | null
  differenceBags: number | null
  differencePct: number | null
}
```

Before locking, recompute `private.daily_loss_source_snapshot(p_day)` and require equality with the saved snapshot. Require a report, prior-day readiness, zero pending harvests, and warning confirmation when required. Then lock `operating_days` and the matching `production_days` row in the same transaction and persist a snapshot containing the loss report.

On reopen, clear both lock states, preserve the required reopen reason, and write one audit entry for the unified operation.

- [x] **Step 4: Remove separate production lock controls**

Delete `ProductionDayControls` from `ProductionBoard`. Remove its actions/service/repository calls and update production tests to lock through `lock_operating_day`. Production action RPCs must continue rejecting writes when the corresponding unified day is locked.

- [x] **Step 5: Update closing UI and messages**

Render hard blockers with their exact cause. When `LOSS_REVIEW_REQUIRED` is present, show `ConfirmLossWarningButton`; after confirmation, revalidate and show the normal `Khóa ngày` button. Remove the loss-override reason input from `LockDayDialog`. Keep reason input only in `ReopenDayDialog`.

Update `CheckList` helper text to:

```text
Quản lý phải xác nhận cảnh báo hao hụt trước khi khóa sổ.
```

for the review condition, and:

```text
Phải xử lý trước khi khóa sổ.
```

for hard blockers.

- [x] **Step 6: Prove unified locking in integration tests**

Assert lock fails for missing report, pending quantity, stale report, and unconfirmed over-threshold difference. Assert a confirmed report locks both day tables. Assert reopening unlocks both and writes audit data. Assert employees cannot confirm, lock, or reopen.

- [x] **Step 7: Run closing and production checks**

```powershell
corepack pnpm vitest run src/modules/closing src/modules/production src/components/closing
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all commands exit `0`.

- [x] **Step 8: Commit Task 7**

```powershell
git add supabase/migrations/20260906090030_daily_loss_closing.sql src/modules/closing src/components/closing 'src/app/(app)/closing/[day]/page.tsx' src/components/production src/modules/production
git commit -m 'feat: unify closing with daily loss'
```

---

### Task 8: Update dashboard, alerts, exports, and backup coverage

**Files:**
- Create: `supabase/migrations/20260906091603_daily_loss_dashboard.sql`
- Create: `supabase/migrations/20260906092257_daily_loss_dashboard_confirmation.sql`
- Modify: `src/modules/reporting/types.ts:1-49`
- Modify: `src/modules/reporting/repository.ts:8-36`
- Modify: `src/modules/reporting/alerts.ts`
- Modify: `src/modules/reporting/alerts.test.ts`
- Modify: `src/modules/reporting/dashboard-service.ts`
- Modify: `src/modules/reporting/dashboard.test.ts`
- Modify: `src/modules/reporting/report-data.ts:8-159`
- Modify: `src/modules/reporting/download-routes.ts`
- Modify: `src/modules/reporting/excel/daily-report.ts`
- Modify: `src/modules/reporting/excel/monthly-report.ts`
- Create: `src/app/api/reports/loss/route.ts`
- Modify: `src/app/(app)/reports/page.tsx:1-24`
- Modify: `src/app/(app)/page.tsx:1-24`
- Modify: `src/app/(app)/alerts/page.tsx`
- Modify: `src/modules/closing/closing.integration.test.ts`
- Modify: `tests/e2e/dashboard.spec.ts`
- Modify: `tests/e2e/reports.spec.ts`

**Interfaces:**
- Dashboard row adds `openingBags`, `expectedClosingBags`, `closingBags`, `differenceBags`, `differencePct`, `lossClassification`, `lossRequiresReview`, and `lossReportStale`.
- Alert codes add `MISSING_LOSS_REPORT`, `PENDING_HARVEST_QUANTITY`, `LOSS_REPORT_STALE`, `LOSS_REVIEW_REQUIRED`, and `LOSS_SURPLUS`; old stock-variance/negative-stock alerts are no longer shown.
- Report kind adds `loss`; the old inventory export remains unlinked for archival access.

- [x] **Step 1: Write failing dashboard and alert tests**

Assert dashboard mapping preserves a nullable rate and signed difference. Assert alerts produce these user messages:

```text
Chưa nhập tồn cuối ngày.
Còn lần xả đá chưa nhập số bao.
Số liệu hao hụt đã thay đổi; cần kiểm tra và lưu lại.
Hao hụt hoặc dư kho vượt ngưỡng 5%.
```

Assert a `-5` bag difference is described as `Dư kho 5 bao`, not negative loss.

- [x] **Step 2: Run reporting tests and verify they fail**

```powershell
corepack pnpm vitest run src/modules/reporting/alerts.test.ts src/modules/reporting/dashboard.test.ts
```

Expected: failures because existing types still require stock ledger fields.

- [x] **Step 3: Replace stock fields in the daily dashboard view**

Create the Task 8 dashboard migration; do not edit the already committed Task 7 migration. Replace `public.daily_dashboard` by joining `daily_loss_reports` on operating day and expose report values plus a computed stale flag from `private.daily_loss_source_snapshot(day)`. Preserve revenue, collected money, debt, expense, and production metrics, but ensure every total groups by stored 20:00-based `operating_day`.

- [x] **Step 4: Update dashboard cards and alerts**

Replace `Tồn thành phẩm` with `Tồn cuối` and `Kiểm kho` with `Hao hụt`. Render:

```text
Tồn cuối: Chưa nhập
Hao hụt: 10 bao · 2%
Dư kho: 5 bao · 1%
Không phát sinh sản xuất
```

The dashboard must link the loss card and related alerts to `/loss`.

- [x] **Step 5: Add the loss detail export**

Extend `ReportKind` with `loss` and query `daily_loss_reports` by `operating_day`. Export columns: day, opening, produced, sold, expected closing, actual closing, signed difference, classification, rate, warning threshold, review flag, confirmer, note, version, and updated time. Change the visible reports list from `Sổ kho thành phẩm` to `Hao hụt sản xuất`.

Add `daily_loss_reports` and `daily_loss_report_versions` to `backupTables`. Keep legacy inventory/stock-count tables in backup because they are archived, not deleted.

- [x] **Step 6: Update daily/monthly Excel summaries**

Add loss bags and nullable loss rate to the daily report. Add monthly totals for produced/sold/loss bags and average rate calculated from aggregate absolute difference divided by aggregate production, not the arithmetic mean of daily percentages.

- [x] **Step 7: Run report and E2E tests**

```powershell
corepack pnpm vitest run src/modules/reporting
corepack pnpm test:e2e --grep 'dashboard|báo cáo|hao hụt'
corepack pnpm lint
corepack pnpm typecheck
```

Expected: all enabled tests pass; Excel generation accepts a null percentage on zero-production days.

- [x] **Step 8: Commit Task 8**

```powershell
git add supabase/migrations/20260906091603_daily_loss_dashboard.sql supabase/migrations/20260906092257_daily_loss_dashboard_confirmation.sql src/modules/reporting src/modules/closing/closing.integration.test.ts src/app/api/reports/loss 'src/app/(app)/reports/page.tsx' 'src/app/(app)/page.tsx' 'src/app/(app)/alerts/page.tsx' src/components/dashboard/alert-list.tsx tests/e2e/dashboard.spec.ts tests/e2e/reports.spec.ts
git commit -m 'feat: report daily production loss'
```

---

### Task 9: Apply the Dev cutover and verify a complete operating day

**Files:**
- Create: `docs/runbooks/daily-loss-cutover.md`
- Modify: `supabase/seed.sql`
- Modify: `tests/e2e/full-day.spec.ts`
- Modify: `tests/e2e/inventory.spec.ts`
- Modify: `scripts/smoke-production.mjs`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Dev seed sets `operating_day_cutover_at = '2026-09-05T13:00:00Z'`, creates the first open operating-day fixture, and never targets the Production project reference.
- Cutover runbook provides separate Dev and Production procedures; Production requires an explicitly chosen future 20:00 boundary.
- Full-day E2E proves sale/production/expense/loss/closing all share one operating day.

- [x] **Step 1: Replace the legacy inventory E2E assertions**

Rename the active scenario to `records and closes daily production loss`. Create harvest quantity `500`, active sales `450`, opening `100`, closing `140`, then assert `Hao hụt 10 bao`, `2%`, and a successful manager lock. Keep `inventory.spec.ts` skipped and clearly labelled as legacy archival coverage rather than deleting it.

- [x] **Step 2: Add safe Dev seed data**

Seed a first-day open `operating_days` row and update only the singleton settings row:

```sql
update public.settings
set operating_day_cutover_at = '2026-09-05T13:00:00Z',
    loss_warning_pct = 5
where id = true;
```

Do not seed a report by bypassing the RPC. The E2E test must create and lock the first report for operating day `2026-09-05` through `save_daily_loss_report` and `lock_operating_day`, then verify inheritance on `2026-09-06`; this exercises the first-day exception, audit, idempotency, and version behavior.

- [x] **Step 3: Write the cutover runbook**

Document this exact order:

1. Confirm the linked Supabase ref is Dev.
2. Back up Dev if it contains manual test data worth keeping.
3. Apply migrations and seed to Dev.
4. Regenerate types and run all checks.
5. Deploy branch `dev` to Vercel Preview using Dev keys.
6. Run the complete 20:00-boundary smoke test.
7. For Production, take a backup, choose a future Bangkok 20:00, apply migrations without Dev seed, set `operating_day_cutover_at`, deploy, enter first opening stock, and monitor one full 24-hour cycle.
8. Roll back application deployment if smoke tests fail; do not delete the new tables or rewrite old operating days.

- [x] **Step 4: Apply migrations to Supabase Dev**

First verify the linked ref without printing credentials, then run:

```powershell
corepack pnpm exec supabase migration list
corepack pnpm exec supabase db push --include-seed
corepack pnpm exec supabase migration list
```

Expected: the six `20260906` migrations appear on both local and remote lists. The target project ref must be `ycjzkesuvkyuuyptpzhb`; stop before `db push` if any other ref is shown.

- [x] **Step 5: Regenerate types and run the complete verification suite**

```powershell
corepack pnpm db:types
corepack pnpm verify:env -- --production
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

Expected: every command exits `0`; environment verification points to Dev without printing key contents.

- [x] **Step 6: Run the full-day browser scenario against Dev**

```powershell
corepack pnpm test:e2e tests/e2e/full-day.spec.ts tests/e2e/loss.spec.ts
```

Expected: current-time entry, late entry at `2026-09-06 19:50`, the exact `2026-09-06 20:00` boundary, first-day loss save/lock, next-day opening inheritance, manager confirmation, history, and legacy redirects all pass.

- [x] **Step 7: Verify security and data separation**

Confirm an anonymous client cannot read loss tables, an employee cannot call the manager confirmation/lock RPCs, version history cannot be updated/deleted, and Dev test rows do not exist in Production. Run database advisors and resolve new security/performance warnings caused by these migrations.

- [x] **Step 8: Commit Task 9**

```powershell
git add docs/runbooks/daily-loss-cutover.md supabase/seed.sql tests/e2e/full-day.spec.ts tests/e2e/inventory.spec.ts scripts/smoke-production.mjs src/lib/supabase/database.types.ts
git commit -m 'test: verify daily loss cutover'
```

- [ ] **Step 9: Push only the Dev branch for Preview review**

```powershell
git status --short
git log --oneline origin/dev..dev
git push origin dev
```

Expected: the working tree is clean, Vercel creates a Preview deployment from `dev`, and no Production deployment occurs. The user performs the Vercel deployment review and promotes only after one complete Dev operating day is accepted.

---

## Final Acceptance Checklist

- [ ] At `19:59:59.999` every module uses the previous operating day; at exactly `20:00:00` every module uses the new day.
- [ ] Machines can start during the former 18:00–20:00 gap, subject only to machine and lock state.
- [ ] Fast entry uses server time; late entry accepts actual Bangkok time and records audit history.
- [ ] Production aggregation follows harvest time, not quantity-entry time.
- [ ] Active wholesale/retail bags are counted regardless of payment; cancelled sales are excluded.
- [ ] Opening stock inherits only from the previous locked closing stock except on the configured first day.
- [ ] Positive difference is loss, zero is matched, and negative difference is surplus.
- [ ] Zero production yields no percentage and never displays a misleading `0%`.
- [ ] Source changes make the saved report stale and revoke prior manager confirmation.
- [ ] Loss above the configured `5%` threshold requires manager confirmation but no reason.
- [ ] One manual operating-day lock synchronizes production and financial data.
- [ ] Legacy stock count/ledger data remain unchanged, hidden, and present in backups.
- [ ] Unit, integration, E2E, lint, typecheck, build, database advisors, and Dev Preview smoke checks pass.
