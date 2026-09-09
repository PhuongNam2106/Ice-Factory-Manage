# Customer Wholesale Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép quản lý đặt giá sỉ mặc định theo khách hàng, để đơn bán sỉ thông thường tự lấy giá từ database và chỉ cho quản lý nhập giá riêng khi nhập bù ngày cũ.

**Architecture:** `customers.wholesale_unit_price_vnd` là nguồn giá hiện hành, còn `sale_lines.unit_price_vnd` là bản chụp bất biến của từng đơn. RPC `create_sale` khóa khách hàng và tự quyết định giá trong cùng giao dịch; frontend chỉ hiển thị giá dự kiến, gửi số bao và nhận lại giá/tổng tiền thực tế từ RPC.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Supabase/Postgres, Vitest, Testing Library, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-09-customer-wholesale-price-design.md`

## Global Constraints

- Làm và kiểm thử trên nhánh `dev`; không áp migration vào Supabase Production và không merge `main` khi chưa được người dùng duyệt.
- Ngày vận hành dùng múi giờ `Asia/Bangkok` và khoảng `[20:00 ngày D, 20:00 ngày D+1)`.
- Mọi đơn bán sỉ bắt buộc có khách hàng.
- Giá sỉ thông thường do database quyết định; không tin giá do trình duyệt gửi.
- Chỉ quản lý được nhập giá riêng cho đơn thuộc ngày vận hành trong quá khứ và ngày đó phải chưa khóa.
- Giá nhập bù không cập nhật giá mặc định của khách hàng.
- Bán lẻ tiếp tục hỗ trợ nhiều dòng và nhập giá thủ công.
- Không sửa hoặc đưa thư mục `supabase/backups/` vào commit.
- Mỗi task dùng TDD, chạy kiểm thử liên quan trước khi commit.

---

## File Map

- `supabase/migrations/*_customer_wholesale_price.sql`: cột giá khách hàng, RPC danh mục và RPC tạo đơn có giá do database kiểm soát.
- `supabase/seed.sql`: giá mặc định cho khách hàng E2E.
- `src/lib/supabase/database.types.ts`: kiểu database sinh lại sau migration.
- `src/modules/admin/catalog-schema.ts`: validation giá khách hàng.
- `src/modules/admin/catalog-actions.ts`: truyền giá vào RPC quản lý khách hàng.
- `src/modules/admin/catalog-service.ts`: đưa giá và trạng thái đủ điều kiện vào model giao diện.
- `src/components/forms/customer-form.tsx`: nhập và hiển thị giá sỉ.
- `src/components/forms/customer-form.test.tsx`: kiểm thử form khách hàng.
- `src/modules/sales/schema.ts`: hợp đồng tách riêng wholesale một số lượng và retail nhiều dòng.
- `src/modules/sales/schema.test.ts`: kiểm thử hợp đồng bán hàng.
- `src/modules/sales/types.ts`: kết quả RPC gồm giá và tổng thực tế.
- `src/modules/sales/service.ts`: parse kết quả và ánh xạ lỗi database.
- `src/components/forms/occurred-at-field.tsx`: báo thay đổi thời gian cho form cha.
- `src/components/forms/occurred-at-field.test.tsx`: kiểm thử callback thời gian.
- `src/components/forms/wholesale-sale-form.tsx`: form bán sỉ một số lượng, giá chỉ đọc và giá nhập bù có điều kiện.
- `src/components/forms/wholesale-sale-form.test.tsx`: kiểm thử tương tác bán sỉ.
- `src/app/(app)/sales/new/wholesale/page.tsx`: truyền quyền quản lý và ngày vận hành hiện tại.
- `src/modules/sales/create-sale.integration.test.ts`: chứng minh database quyết định giá và bảo vệ override.
- `src/modules/audit/cancellation.integration.test.ts`: cập nhật fixture khách hàng có giá.
- `src/modules/receivables/record-receipt.integration.test.ts`: cập nhật fixture khách hàng có giá.
- `tests/e2e/sales.spec.ts`: luồng nhân viên bán sỉ không nhập giá.
- `tests/e2e/full-day.spec.ts`: payload bán sỉ mới và số liệu báo cáo không hồi quy.

---

### Task 1: Define Customer and Sale Contracts

**Files:**
- Modify: `src/modules/admin/catalog-schema.ts`
- Modify: `src/modules/admin/catalog.test.ts`
- Modify: `src/modules/sales/schema.ts`
- Modify: `src/modules/sales/schema.test.ts`
- Modify: `src/modules/sales/types.ts`

**Interfaces:**
- Produces: `CustomerMutationInput.wholesaleUnitPriceVnd`.
- Produces: wholesale input `{ kind, customerId, quantityBags, historicalUnitPriceVnd, occurredAt, paidNowVnd, paymentMethod, note, idempotencyKey }`.
- Preserves: retail input `{ kind, shiftCode, lines, occurredAt, paidNowVnd, paymentMethod, note, idempotencyKey }`.
- Produces: kết quả phân biệt theo `kind`: wholesale có `unitPriceVnd: number`, retail có `unitPriceVnd: null`; cả hai có `saleId`, `totalVnd` và `usedHistoricalPrice`.

- [ ] **Step 1: Add failing customer price validation tests**

Add cases to `src/modules/admin/catalog.test.ts`:

```ts
it('requires a positive integer wholesale price', () => {
  for (const wholesaleUnitPriceVnd of ['', 0, -1, 7000.5]) {
    expect(() => customerSchema.parse({
      name: 'Đầu mối A',
      paymentTermDays: 7,
      wholesaleUnitPriceVnd,
    })).toThrow()
  }
})

it('normalizes a valid wholesale price', () => {
  expect(customerSchema.parse({
    name: 'Đầu mối A',
    paymentTermDays: 7,
    wholesaleUnitPriceVnd: '7000',
  }).wholesaleUnitPriceVnd).toBe(7000)
})
```

- [ ] **Step 2: Add failing wholesale contract tests**

Replace the old optional-customer wholesale test in `src/modules/sales/schema.test.ts` with tests proving that wholesale requires a customer and one quantity, does not accept `lines`, and only accepts a positive optional historical price:

```ts
const wholesale = {
  ...base,
  kind: 'wholesale' as const,
  customerId: crypto.randomUUID(),
  quantityBags: '10',
  historicalUnitPriceVnd: null,
  paidNowVnd: 0,
}

expect(createSaleSchema.parse(wholesale)).toMatchObject({
  kind: 'wholesale',
  quantityBags: 10,
  historicalUnitPriceVnd: null,
})

expect(() => createSaleSchema.parse({ ...wholesale, customerId: null })).toThrow('Khách hàng')
expect(() => createSaleSchema.parse({ ...wholesale, quantityBags: 0 })).toThrow('Số bao')
expect(() => createSaleSchema.parse({ ...wholesale, historicalUnitPriceVnd: 0 })).toThrow('Giá sỉ')
```

- [ ] **Step 3: Run the focused tests and confirm RED**

Run:

```powershell
corepack pnpm vitest run src/modules/admin/catalog.test.ts src/modules/sales/schema.test.ts
```

Expected: FAIL because the customer price field and single-quantity wholesale contract do not exist.

- [ ] **Step 4: Implement the split Zod contracts**

In `catalog-schema.ts`, add a shared positive VND schema and include it in `customerSchema`:

```ts
const positiveVndSchema = z.coerce
  .number()
  .int('Giá sỉ phải là số nguyên')
  .positive('Giá sỉ phải lớn hơn 0')
  .max(100_000_000_000_000)
  .refine(Number.isSafeInteger, 'Giá sỉ vượt quá giới hạn an toàn')

wholesaleUnitPriceVnd: positiveVndSchema,
```

Add `wholesaleUnitPriceVnd: 7000` to every existing valid `customerSchema.parse()` fixture in this test file so each case exercises the new required contract.

In `sales/schema.ts`, keep `saleLineSchema` for retail, move `lines` out of common fields, and define wholesale as:

```ts
const wholesaleSaleSchema = z.object({
  ...commonSaleFields,
  kind: z.literal('wholesale'),
  customerId: z.string().uuid('Khách hàng là bắt buộc'),
  quantityBags: quantityBagsSchema,
  historicalUnitPriceVnd: unitPriceSchema.optional().nullable().default(null),
})

const retailSaleSchema = z.object({
  ...commonSaleFields,
  kind: z.literal('retail'),
  shiftCode: shiftCodeSchema,
  lines: z.array(saleLineSchema).min(1).max(50),
})
```

In `superRefine`, calculate and validate totals only for retail. Wholesale overpayment remains database-authoritative because the price is not supplied by the employee.

Update `CreateSaleResult` in `sales/types.ts`:

```ts
export type CreateSaleResult = {
  saleId: string
  kind: 'wholesale'
  unitPriceVnd: number
  totalVnd: number
  usedHistoricalPrice: boolean
} | {
  saleId: string
  kind: 'retail'
  unitPriceVnd: null
  totalVnd: number
  usedHistoricalPrice: false
}
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```powershell
corepack pnpm vitest run src/modules/admin/catalog.test.ts src/modules/sales/schema.test.ts
```

Expected: both focused test files PASS. Downstream callers are updated in Tasks 6–7; do not weaken the new schema to preserve their old payload.

- [ ] **Step 6: Commit the contracts**

```powershell
git add src/modules/admin/catalog-schema.ts src/modules/admin/catalog.test.ts src/modules/sales/schema.ts src/modules/sales/schema.test.ts src/modules/sales/types.ts
git commit -m "feat: define customer wholesale pricing contracts"
```

---

### Task 2: Add the Database-Authoritative Pricing Migration

**Files:**
- Create via Supabase CLI: `supabase/migrations/*_customer_wholesale_price.sql`
- Modify: `src/modules/sales/create-sale.integration.test.ts`

**Interfaces:**
- Consumes: wholesale JSON contract from Task 1.
- Produces: `customers.wholesale_unit_price_vnd bigint`.
- Produces: `upsert_customer(uuid,text,text,text,integer,bigint) returns uuid`.
- Produces: `create_sale(jsonb,uuid)` response containing `kind`, `saleId`, `unitPriceVnd`, `totalVnd`, and `usedHistoricalPrice`.

- [ ] **Step 1: Extend integration setup and write failing security cases**

Update customer fixtures in `create-sale.integration.test.ts` to include `wholesale_unit_price_vnd: 7000`. Create/sign in both an employee and a manager. Add assertions for:

```ts
const normalInput = {
  kind: 'wholesale',
  occurredAt: currentOccurredAt,
  customerId,
  quantityBags: 10,
  historicalUnitPriceVnd: null,
  paidNowVnd: 0,
  paymentMethod: 'cash',
}

expect(normalResult.data).toMatchObject({
  kind: 'wholesale',
  unitPriceVnd: 7000,
  totalVnd: 70000,
  usedHistoricalPrice: false,
})
```

Also assert:

- A customer price changed to `7500` before submission yields `7500` and leaves the earlier sale line at `7000`.
- An active customer with `NULL` price returns `CUSTOMER_WHOLESALE_PRICE_MISSING`.
- An employee sending `historicalUnitPriceVnd` for a past day returns `HISTORICAL_WHOLESALE_PRICE_FORBIDDEN`.
- A manager sending `6500` for a past open day succeeds with `usedHistoricalPrice: true` and does not update the customer price.
- A historical override on the current day returns `HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED`.
- A past wholesale sale without `historicalUnitPriceVnd` returns `HISTORICAL_WHOLESALE_PRICE_REQUIRED`.

- [ ] **Step 2: Run the integration test and confirm RED**

With local Supabase running and reset to the current schema:

```powershell
$env:RUN_SUPABASE_INTEGRATION='true'
corepack pnpm vitest run src/modules/sales/create-sale.integration.test.ts
Remove-Item Env:RUN_SUPABASE_INTEGRATION
```

Expected: FAIL because the customer column and RPC behavior do not exist.

- [ ] **Step 3: Check current Supabase changes before authoring SQL**

Open `https://supabase.com/changelog.md`, scan entries tagged `breaking-change` for Database, Postgres functions, CLI migrations and generated TypeScript types, then follow any relevant linked entry. Also confirm current migration commands with `corepack pnpm exec supabase migration new --help`. No dependency upgrade is part of this feature unless a documented breaking change makes it necessary.

- [ ] **Step 4: Create the migration with the CLI**

Run exactly:

```powershell
corepack pnpm exec supabase migration new customer_wholesale_price
```

Use the path printed by the CLI; do not rename its generated timestamp.

- [ ] **Step 5: Add the customer column and replace the catalog RPC**

The generated migration must add:

```sql
alter table public.customers
  add column wholesale_unit_price_vnd bigint,
  add constraint customers_wholesale_unit_price_vnd_positive
    check (
      wholesale_unit_price_vnd is null
      or wholesale_unit_price_vnd between 1 and 100000000000000
    );

drop function public.upsert_customer(uuid, text, text, text, integer);
```

Recreate `upsert_customer` with `p_wholesale_unit_price_vnd bigint`. Before insert/update, reject a null, non-positive or excessive value with `INVALID_WHOLESALE_PRICE` and SQLSTATE `22023`. Preserve `private.require_manager()`, row locking, `customer.created`/`customer.updated`, `search_path = ''`, and before/after audit data. Revoke execution from `public`, `anon`, `authenticated`, and `service_role`, then grant only to `authenticated, service_role`.

- [ ] **Step 6: Replace wholesale pricing inside `create_sale`**

Preserve retail logic exactly. In the wholesale branch:

```sql
v_customer_id := nullif(p_input->>'customerId', '')::uuid;
if v_customer_id is null then
  raise exception 'WHOLESALE_CUSTOMER_REQUIRED' using errcode = '22023';
end if;

select customer.payment_term_days, customer.wholesale_unit_price_vnd
into v_customer_payment_term, v_customer_price_vnd
from public.customers as customer
where customer.id = v_customer_id and customer.is_active
for update;

if not found then
  raise exception 'ACTIVE_CUSTOMER_NOT_FOUND' using errcode = 'P0002';
end if;
```

Parse `quantityBags` as one positive bigint. Determine current operating day with `private.operating_day_at(statement_timestamp())`. Apply this exact decision table:

| Sale day | Historical price | Actor | Result |
|---|---:|---|---|
| Before current day | Missing | Any | `HISTORICAL_WHOLESALE_PRICE_REQUIRED` |
| Before current day | Present | Employee | `HISTORICAL_WHOLESALE_PRICE_FORBIDDEN` |
| Before current day | Present | Manager | Use override |
| Current/future day | Present | Any | `HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED` |
| Current/future day | Missing | Any | Use customer default |

For default pricing, raise `CUSTOMER_WHOLESALE_PRICE_MISSING` when the column is null. Insert exactly one `sale_lines` row for wholesale. Retail continues iterating `lines`.

Extend the audit payload with:

```sql
'unitPriceVnd', v_unit_price_vnd,
'pricingSource', case when v_used_historical_price then 'historical_override' else 'customer_default' end
```

Return and persist the idempotency response as:

```sql
v_response := jsonb_build_object(
  'saleId', v_sale.id,
  'kind', v_kind,
  'unitPriceVnd', case when v_kind = 'wholesale' then v_unit_price_vnd else null end,
  'totalVnd', v_total_vnd,
  'usedHistoricalPrice', v_used_historical_price
);
```

- [ ] **Step 7: Reset local database and run integration tests**

```powershell
corepack pnpm db:reset
$env:RUN_SUPABASE_INTEGRATION='true'
corepack pnpm vitest run src/modules/sales/create-sale.integration.test.ts
Remove-Item Env:RUN_SUPABASE_INTEGRATION
```

Expected: migration applies and all sales integration cases PASS.

- [ ] **Step 8: Run database advisors**

Use the available Supabase MCP advisors against the Dev project, or with a compatible CLI run:

```powershell
corepack pnpm exec supabase db advisors --local
```

Expected: no new security or performance finding caused by the migration. Fix any finding attributable to this migration before committing.

- [ ] **Step 9: Commit the migration and integration proof**

```powershell
git add supabase/migrations src/modules/sales/create-sale.integration.test.ts
git commit -m "feat: enforce wholesale pricing in database"
```

Confirm `git status --short` still shows `supabase/backups/` as untracked and not staged.

---

### Task 3: Regenerate Types and Wire the Customer Data Layer

**Files:**
- Modify: `src/lib/supabase/database.types.ts`
- Modify: `src/modules/admin/catalog-actions.ts`
- Modify: `src/modules/admin/catalog-service.ts`
- Modify: `src/modules/admin/catalog.test.ts`

**Interfaces:**
- Consumes: migration/RPC from Task 2.
- Produces: `CustomerOption.wholesaleUnitPriceVnd: number | null`.
- Produces: `CustomerOption.canCreateWholesaleSale: boolean`.

- [ ] **Step 1: Add failing catalog mapping expectations**

Extend catalog service coverage so returned records map `wholesale_unit_price_vnd` to `wholesaleUnitPriceVnd`, and active customers with null price return `canCreateWholesaleSale: false` rather than being removed.

- [ ] **Step 2: Run catalog tests and confirm RED**

```powershell
corepack pnpm vitest run src/modules/admin/catalog.test.ts
```

Expected: FAIL on missing mapped price/eligibility.

- [ ] **Step 3: Regenerate database types**

With local Supabase running after Task 2:

```powershell
corepack pnpm db:types
```

Verify `database.types.ts` contains `wholesale_unit_price_vnd` in Customer Row/Insert/Update and `p_wholesale_unit_price_vnd` in `upsert_customer.Args`.

- [ ] **Step 4: Pass and map the customer price**

In `catalog-actions.ts`, include:

```ts
p_wholesale_unit_price_vnd: parsed.data.wholesaleUnitPriceVnd,
```

In `catalog-service.ts`, select `wholesale_unit_price_vnd` and expose:

```ts
export type CustomerOption = {
  id: string
  name: string
  phone: string | null
  paymentTermDays: number
  wholesaleUnitPriceVnd: number | null
  canCreateWholesaleSale: boolean
}
```

Map eligibility as `customer.is_active && customer.wholesale_unit_price_vnd !== null`. `listActiveCustomers` must retain active customers with null prices so the form can explain why they cannot be used.

- [ ] **Step 5: Run tests and typecheck**

```powershell
corepack pnpm vitest run src/modules/admin/catalog.test.ts
```

Expected: catalog tests PASS. Form and fixture callers are updated in Tasks 4, 6 and 7.

- [ ] **Step 6: Commit the data layer**

```powershell
git add src/lib/supabase/database.types.ts src/modules/admin/catalog-actions.ts src/modules/admin/catalog-service.ts src/modules/admin/catalog.test.ts
git commit -m "feat: expose customer wholesale prices"
```

---

### Task 4: Add Wholesale Price to Customer Management

**Files:**
- Create: `src/components/forms/customer-form.test.tsx`
- Modify: `src/components/forms/customer-form.tsx`
- Modify: `src/app/(app)/admin/customers/page.tsx`

**Interfaces:**
- Consumes: `CustomerRecord.wholesaleUnitPriceVnd` and `saveCustomer()` from Task 3.
- Produces: accessible input labelled `Giá sỉ mỗi bao (VNĐ)`.

- [ ] **Step 1: Write failing component tests**

Mock `saveCustomer` and assert that creating a customer submits a normalized price:

```ts
await user.type(screen.getByLabelText('Tên khách hàng'), 'Đầu mối A')
await user.clear(screen.getByLabelText('Giá sỉ mỗi bao (VNĐ)'))
await user.type(screen.getByLabelText('Giá sỉ mỗi bao (VNĐ)'), '7000')
await user.click(screen.getByRole('button', { name: 'Thêm khách hàng' }))

expect(saveCustomer).toHaveBeenCalledWith(expect.objectContaining({
  wholesaleUnitPriceVnd: '7000',
}))
```

Render an existing customer and assert its price is present plus the notice `Giá mới chỉ áp dụng cho các đơn tạo sau khi lưu`.

- [ ] **Step 2: Run the component test and confirm RED**

```powershell
corepack pnpm vitest run src/components/forms/customer-form.test.tsx
```

Expected: FAIL because the input and notice do not exist.

- [ ] **Step 3: Implement the customer price UI**

Add a required numeric input with `inputMode="numeric"`, `min="1"`, `step="1"`, and default value `customer?.wholesaleUnitPriceVnd ?? ''`. Submit it as `wholesaleUnitPriceVnd`.

For existing customers with null price, render a visible amber `Chưa thiết lập giá sỉ` status. For configured customers, show the formatted price in the form header. Update the page description to mention customer-specific wholesale pricing.

- [ ] **Step 4: Run tests, lint the files, and commit**

```powershell
corepack pnpm vitest run src/components/forms/customer-form.test.tsx src/modules/admin/catalog.test.ts
corepack pnpm eslint src/components/forms/customer-form.tsx src/components/forms/customer-form.test.tsx 'src/app/(app)/admin/customers/page.tsx'
git add src/components/forms/customer-form.tsx src/components/forms/customer-form.test.tsx 'src/app/(app)/admin/customers/page.tsx'
git commit -m "feat: manage wholesale price per customer"
```

Expected: tests and ESLint PASS.

---

### Task 5: Expose Occurrence Changes to the Wholesale Form

**Files:**
- Modify: `src/components/forms/occurred-at-field.tsx`
- Modify: `src/components/forms/occurred-at-field.test.tsx`

**Interfaces:**
- Produces: optional prop `onValueChange?: (localValue: string | null) => void`.
- `null` means server/current time; a string is the current `datetime-local` value.

- [ ] **Step 1: Add failing callback tests**

Test that unchecking `Dùng giờ hiện tại` and changing the datetime emits the local value, and rechecking emits `null`:

```ts
const onValueChange = vi.fn()
render(<OccurredAtField onValueChange={onValueChange} />)
await user.click(screen.getByLabelText('Dùng giờ hiện tại'))
await user.type(screen.getByLabelText('Thời gian thực tế'), '2026-09-01T20:00')
expect(onValueChange).toHaveBeenLastCalledWith('2026-09-01T20:00')
await user.click(screen.getByLabelText('Dùng giờ hiện tại'))
expect(onValueChange).toHaveBeenLastCalledWith(null)
```

- [ ] **Step 2: Run and confirm RED**

```powershell
corepack pnpm vitest run src/components/forms/occurred-at-field.test.tsx
```

- [ ] **Step 3: Implement the optional callback without changing existing callers**

Invoke `onValueChange(null)` whenever current time becomes active. Invoke `onValueChange(event.target.value)` on datetime changes. Keep the existing `name="occurredAt"` field and its accessibility labels unchanged.

- [ ] **Step 4: Verify and commit**

```powershell
corepack pnpm vitest run src/components/forms/occurred-at-field.test.tsx
git add src/components/forms/occurred-at-field.tsx src/components/forms/occurred-at-field.test.tsx
git commit -m "feat: report selected occurrence time"
```

---

### Task 6: Replace the Wholesale Multi-Line Editor with Customer Pricing

**Files:**
- Create: `src/components/forms/wholesale-sale-form.test.tsx`
- Modify: `src/components/forms/wholesale-sale-form.tsx`
- Modify: `src/app/(app)/sales/new/wholesale/page.tsx`
- Modify: `src/modules/sales/service.ts`

**Interfaces:**
- Consumes: customer price/eligibility from Task 3.
- Consumes: `OccurredAtField.onValueChange` from Task 5.
- Consumes: database response from Task 2.
- Produces form props:

```ts
type WholesaleSaleFormProps = {
  customers: CustomerOption[]
  canEnterHistoricalPrice: boolean
  currentOperatingDay: string
}
```

- [ ] **Step 1: Write failing form tests**

Mock `createSale` and cover these behaviors:

- Selecting a priced customer shows `7.000 VNĐ/bao` read-only.
- Entering 10 bags shows `70.000 VNĐ`.
- There is no editable normal-price field and no `Thêm mức giá` button.
- A null-price customer displays `Khách hàng chưa được thiết lập giá sỉ` and disables submit.
- An employee selecting a past time never sees `Giá sỉ thực tế mỗi bao`.
- A manager selecting a past operating day sees and must fill the historical price field.
- Submit sends `quantityBags` and `historicalUnitPriceVnd`, not `lines`.
- A result whose `unitPriceVnd` differs from the selected price displays the actual price and the price-change notice.

- [ ] **Step 2: Run the test and confirm RED**

```powershell
corepack pnpm vitest run src/components/forms/wholesale-sale-form.test.tsx
```

- [ ] **Step 3: Parse the expanded RPC result and errors**

In `sales/service.ts`, change the response schema to:

```ts
const createSaleResultSchema = z.discriminatedUnion('kind', [
  z.object({
    saleId: z.string().uuid(),
    kind: z.literal('wholesale'),
    unitPriceVnd: z.number().int().positive(),
    totalVnd: z.number().int().nonnegative(),
    usedHistoricalPrice: z.boolean(),
  }),
  z.object({
    saleId: z.string().uuid(),
    kind: z.literal('retail'),
    unitPriceVnd: z.null(),
    totalVnd: z.number().int().nonnegative(),
    usedHistoricalPrice: z.literal(false),
  }),
])
```

Add explicit Vietnamese mappings for:

```text
WHOLESALE_CUSTOMER_REQUIRED
CUSTOMER_WHOLESALE_PRICE_MISSING
INVALID_WHOLESALE_PRICE
HISTORICAL_WHOLESALE_PRICE_REQUIRED
HISTORICAL_WHOLESALE_PRICE_FORBIDDEN
HISTORICAL_WHOLESALE_PRICE_NOT_ALLOWED
PAID_AMOUNT_EXCEEDS_TOTAL
```

- [ ] **Step 4: Implement the single-quantity wholesale form**

Remove `SaleLineEditor` and its local line array from wholesale only. Track selected customer, quantity, selected local occurrence time and last saved result. Compute the preview total from the selected customer price.

Derive historical mode only when all are true:

```ts
const isHistoricalBackfill = canEnterHistoricalPrice
  && selectedOccurredAt !== null
  && getOperatingDay(new Date(parseBangkokOccurredAt(selectedOccurredAt))) < currentOperatingDay
```

Guard invalid/incomplete datetime values instead of throwing during render. The server/database remains authoritative.

Render null-price customers in the select with suffix `— Chưa thiết lập giá sỉ`; keep them selectable so the user can see the explanation, but disable the submit button.

Submit this shape:

```ts
{
  kind: 'wholesale',
  occurredAt,
  customerId,
  quantityBags,
  historicalUnitPriceVnd: isHistoricalBackfill
    ? String(formData.get('historicalUnitPriceVnd') ?? '')
    : null,
  paidNowVnd,
  paymentMethod,
  note,
  idempotencyKey,
}
```

After success, show the actual total from `result.data.totalVnd`. If the normal displayed price differs from `result.data.unitPriceVnd`, show `Giá khách hàng vừa thay đổi; đơn đã được tính theo giá mới nhất.`

- [ ] **Step 5: Pass role and operating day from the server page**

In `src/app/(app)/sales/new/wholesale/page.tsx`:

```ts
const [customers, user] = await Promise.all([
  listActiveCustomers(),
  requireUser(),
])
const currentOperatingDay = getOperatingDay(new Date())

<WholesaleSaleForm
  canEnterHistoricalPrice={user.role === 'manager'}
  currentOperatingDay={currentOperatingDay}
  customers={customers}
/>
```

- [ ] **Step 6: Run component, schema, lint and type checks**

```powershell
corepack pnpm vitest run src/components/forms/wholesale-sale-form.test.tsx src/components/forms/occurred-at-field.test.tsx src/modules/sales/schema.test.ts
corepack pnpm eslint src/components/forms/wholesale-sale-form.tsx src/components/forms/wholesale-sale-form.test.tsx src/modules/sales/service.ts 'src/app/(app)/sales/new/wholesale/page.tsx'
corepack pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 7: Commit the wholesale UI**

```powershell
git add src/components/forms/wholesale-sale-form.tsx src/components/forms/wholesale-sale-form.test.tsx src/modules/sales/service.ts 'src/app/(app)/sales/new/wholesale/page.tsx'
git commit -m "feat: auto-price wholesale sales by customer"
```

---

### Task 7: Update Seeds and Regression Fixtures

**Files:**
- Modify: `supabase/seed.sql`
- Modify: `src/modules/audit/cancellation.integration.test.ts`
- Modify: `src/modules/receivables/record-receipt.integration.test.ts`
- Modify: `tests/e2e/sales.spec.ts`
- Modify: `tests/e2e/full-day.spec.ts`

**Interfaces:**
- Consumes: new wholesale input and customer price column.
- Preserves: cancellation, receivables, reporting, retail and daily-loss behavior.

- [ ] **Step 1: Update the local E2E customer**

Add `wholesale_unit_price_vnd` to the seeded customer columns and set it to `7000`.

- [ ] **Step 2: Update every wholesale integration fixture**

For customers used by wholesale tests, insert a positive `wholesale_unit_price_vnd`. Replace wholesale payloads of:

```ts
lines: [{ quantityBags: 10, unitPriceVnd: 7000 }]
```

with:

```ts
quantityBags: 10,
historicalUnitPriceVnd: null,
```

Where a fixture uses a past operating day, authenticate as manager and provide the historical price, or choose a current test time when the behavior under test is unrelated to backfill.

- [ ] **Step 3: Update the mobile sales E2E flow**

In `tests/e2e/sales.spec.ts`, replace the two wholesale price/line interactions with:

```ts
await page.getByLabel('Khách hàng đầu mối').selectOption({ index: 1 })
await expect(page.getByText('7.000 VNĐ/bao')).toBeVisible()
await page.getByLabel('Số lượng bao').fill('10')
await expect(page.getByText('70.000 VNĐ')).toBeVisible()
```

Keep the retail multi-line assertions unchanged.

- [ ] **Step 4: Update full-day report setup without changing expected accounting**

Ensure the fixed customer has price `7000`, use the manager client plus `historicalUnitPriceVnd: 7000` for the historical wholesale sale, and preserve expected revenue `3_900_000`, wholesale revenue `2_100_000`, production and loss totals.

- [ ] **Step 5: Reset and run all integration tests**

```powershell
corepack pnpm db:reset
$env:RUN_SUPABASE_INTEGRATION='true'
corepack pnpm test
Remove-Item Env:RUN_SUPABASE_INTEGRATION
```

Expected: all unit/component tests PASS and local-only integration suites PASS.

- [ ] **Step 6: Run sales and full-day E2E**

In one terminal:

```powershell
corepack pnpm dev
```

In another terminal:

```powershell
$env:RUN_SALES_E2E='true'
$env:RUN_FULL_DAY_E2E='true'
corepack pnpm exec playwright test tests/e2e/sales.spec.ts tests/e2e/full-day.spec.ts
Remove-Item Env:RUN_SALES_E2E
Remove-Item Env:RUN_FULL_DAY_E2E
```

Expected: both E2E scenarios PASS.

- [ ] **Step 7: Commit fixture and regression updates**

```powershell
git add supabase/seed.sql src/modules/audit/cancellation.integration.test.ts src/modules/receivables/record-receipt.integration.test.ts tests/e2e/sales.spec.ts tests/e2e/full-day.spec.ts
git commit -m "test: update wholesale pricing fixtures"
```

---

### Task 8: Verify and Release to the Dev Environment

**Files:**
- Modify only if verification exposes a defect: files already listed in Tasks 1–7.

**Interfaces:**
- Produces: verified `dev` branch and Supabase Dev schema.
- Does not touch: Supabase Production or `main`.

- [ ] **Step 1: Run the complete local quality gate**

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Expected: every command exits with code 0.

- [ ] **Step 2: Verify migration history and target identity**

```powershell
corepack pnpm exec supabase migration list --local
Get-Content -LiteralPath 'supabase/.temp/project-ref'
```

Expected project ref: `ycjzkesuvkyuuyptpzhb`. Stop immediately if the ref is `mqclrhhatdkghvdebbyq` or any other project.

- [ ] **Step 3: Apply the migration only to Supabase Dev**

Use Supabase MCP migration tooling scoped to project `ycjzkesuvkyuuyptpzhb`. If using CLI, first link explicitly and then inspect pending migrations before push:

```powershell
corepack pnpm exec supabase link --help
corepack pnpm exec supabase db push --help
corepack pnpm exec supabase link --project-ref ycjzkesuvkyuuyptpzhb
corepack pnpm exec supabase db push --dry-run
corepack pnpm exec supabase db push
```

Expected: only the customer wholesale price migration is newly applied. Do not seed remote Dev automatically if it contains shared test data; update test customers through the manager UI instead.

- [ ] **Step 4: Run Dev database verification**

Verify through Supabase MCP SQL:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'customers'
  and column_name = 'wholesale_unit_price_vnd';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('upsert_customer', 'create_sale');
```

Expected: the column exists as nullable `bigint`, and both RPCs exist.

- [ ] **Step 5: Run a manual Preview acceptance pass**

On Vercel Preview connected to Supabase Dev:

1. Manager creates a customer with price `7000`.
2. Employee sells 10 bags and sees total `70.000 VNĐ` without a price input.
3. Manager changes the customer price to `7500` and confirms a new 10-bag order totals `75.000 VNĐ`.
4. Confirm the first order remains `70.000 VNĐ` in sales/reporting.
5. Manager selects a past open operating day, enters the historical price and saves successfully.
6. Employee cannot see or submit a historical price override.
7. Retail still supports multiple prices and saves successfully.

- [ ] **Step 6: Confirm branch state and report for user approval**

```powershell
git status --short --branch
git log --oneline --decorate -8
```

Expected: feature commits are on `dev`; only user-owned `supabase/backups/` may remain untracked. Report the Dev migration name, verification results and Preview URL. Wait for explicit user approval before merging to `main` or applying anything to Production.

---

## Final Acceptance Checklist

- [ ] New customers require a positive wholesale price.
- [ ] Existing null-price customers remain visible but cannot be used for wholesale sales.
- [ ] Every wholesale sale has a customer and one bag quantity.
- [ ] Database ignores client attempts to choose the normal wholesale price.
- [ ] Historical override is manager-only, past-day-only and open-day-only.
- [ ] Stored sale lines retain their original unit price after customer price changes.
- [ ] Audit contains customer before/after prices and sale pricing source.
- [ ] Receivables and receipts use the database-derived total.
- [ ] Retail multi-line/manual pricing is unchanged.
- [ ] Unit, component, integration, E2E, lint, typecheck and build pass.
- [ ] Supabase Dev is updated; Supabase Production and `main` remain untouched.
