# Realtime Machine Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay luồng sản xuất theo mẻ/tổng ca bằng bảng điều khiển từng máy theo thời gian thực, ghi nhận Bắt đầu/Xả/Tắt/số bao và báo cáo năng suất độc lập với tồn kho.

**Architecture:** PostgreSQL giữ trạng thái chuẩn bằng `production_days`, `machine_runs` và `machine_harvests`; mọi thay đổi đi qua RPC idempotent có khóa theo máy. Next.js tải snapshot bằng Server Component, Client Component gửi Server Action và nghe private Supabase Realtime Broadcast để `router.refresh()` sau mỗi thay đổi.

**Tech Stack:** TypeScript 5.9, Next.js 16 App Router, React 19, Tailwind CSS 4, Zod 4, Supabase PostgreSQL/Auth/Realtime, Vitest, Testing Library và Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-realtime-machine-production-design.md`

## Global Constraints

- Múi giờ nghiệp vụ là `Asia/Bangkok`; ngày sản xuất từ 20:00 đến 18:00 hôm sau và mang nhãn ngày bắt đầu.
- Thời điểm Bắt đầu/Xả/Tắt thông thường phải lấy từ database, không lấy từ đồng hồ thiết bị.
- Chỉ một phiên mở và một lần xả chờ nhập trên mỗi máy.
- Số bao là số nguyên không âm; `0` là giá trị đã nhập hợp lệ.
- Không ghi sản lượng mới vào `inventory_ledger` và không dùng sản xuất để chặn khóa sổ tài chính/tồn kho.
- Không hỗ trợ ghi offline; phải giải thích rõ vì sao nút bị khóa.
- Giao diện và thông báo bằng tiếng Việt, mobile-first nhưng dùng đầy đủ trên máy tính.
- Giữ nguyên thay đổi không liên quan đang có trong `next-env.d.ts`.

---

### Task 1: Quy tắc ngày sản xuất và trạng thái trình bày

**Files:**
- Create: `src/modules/production/production-day.ts`
- Create: `src/modules/production/production-day.test.ts`
- Create: `src/modules/production/presentation.ts`
- Create: `src/modules/production/presentation.test.ts`

**Interfaces:**
- Produces: `getProductionDate(now: Date): string`
- Produces: `getProductionWindow(productionDate: string): { startsAt: Date; endsAt: Date }`
- Produces: `canStartMachine(now: Date): boolean`
- Produces: `getRunOvertimeLevel(now, endsAt): 'none' | 'warning' | 'critical'`
- Produces: `isHarvestReminderDue(harvestedAt, now, reminderMinutes): boolean`

- [ ] **Step 1: Viết test thất bại cho mốc 18:00/20:00 và DST-independent Bangkok conversion**

```ts
expect(getProductionDate(new Date('2026-09-05T10:59:59Z'))).toBe('2026-09-04')
expect(getProductionDate(new Date('2026-09-05T13:00:00Z'))).toBe('2026-09-05')
expect(canStartMachine(new Date('2026-09-05T10:59:59Z'))).toBe(true)
expect(canStartMachine(new Date('2026-09-05T11:00:00Z'))).toBe(false)
expect(canStartMachine(new Date('2026-09-05T13:00:00Z'))).toBe(true)
```

- [ ] **Step 2: Chạy `corepack pnpm vitest run src/modules/production/production-day.test.ts` và xác nhận FAIL do module chưa tồn tại**
- [ ] **Step 3: Cài đặt các hàm thuần bằng `Intl.DateTimeFormat` với `Asia/Bangkok`, không phụ thuộc timezone máy chạy**
- [ ] **Step 4: Viết test thất bại cho nhắc 30 phút và cảnh báo quá 18:00/20:00**
- [ ] **Step 5: Cài đặt presentation helpers, chạy hai test file đến khi PASS**
- [ ] **Step 6: Chạy lint và typecheck, sau đó commit `feat: add production day rules`**

### Task 2: Schema PostgreSQL, RPC và Realtime

**Files:**
- Create: `supabase/migrations/20260904054132_realtime_machine_production.sql`
- Replace: `src/modules/production/production.integration.test.ts`
- Modify: `src/modules/closing/closing.integration.test.ts`
- Modify: `src/modules/audit/cancellation.integration.test.ts`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- RPC: `start_machine(p_machine_id uuid, p_idempotency_key uuid) -> jsonb`
- RPC: `record_machine_harvest(p_machine_id uuid, p_idempotency_key uuid) -> jsonb`
- RPC: `stop_machine(p_machine_id uuid, p_idempotency_key uuid) -> jsonb`
- RPC: `set_harvest_quantity(p_harvest_id bigint, p_quantity bigint, p_idempotency_key uuid) -> jsonb`
- RPC manager: `correct_production_action(p_input jsonb, p_idempotency_key uuid) -> jsonb`
- RPC manager: `lock_production_day(p_production_date date) -> jsonb`
- RPC manager: `reopen_production_day(p_production_date date) -> jsonb`

- [x] **Step 1: Tạo migration bằng `corepack pnpm supabase migration new realtime_machine_production`**
- [ ] **Step 2: Viết integration tests thất bại cho start → harvest → quantity → stop, 0 bao và không đổi inventory**
- [ ] **Step 3: Viết integration tests thất bại cho idempotency, hai thao tác cạnh tranh và các trạng thái lỗi**
- [ ] **Step 4: Viết integration tests thất bại cho quyền sửa số bao, quản lý chỉnh giờ, khóa/mở ngày và audit trước/sau**
- [ ] **Step 5: Viết migration tạo bảng, check constraints, FK indexes và partial unique indexes theo spec**
- [ ] **Step 6: Viết RPC với `security definer set search_path = ''`, kiểm tra active profile, quyền, production-day state và `pg_advisory_xact_lock(hashtextextended(machine_id::text, 0))`**
- [ ] **Step 7: Tạo trigger dùng `realtime.broadcast_changes()` với topic `production:machines`; policy `realtime.messages` chỉ cho profile đang hoạt động nhận broadcast**
- [ ] **Step 8: Thay `get_daily_reconciliation`, `daily_dashboard` và `cancel_document` để không còn phụ thuộc bảng sản xuất cũ; production bags chỉ là KPI từ harvest**
- [ ] **Step 9: Xóa đúng ledger sản xuất cũ cùng reversal liên quan, rồi drop RPC/bảng/type cũ sau khi đã gỡ mọi dependency**
- [ ] **Step 10: Reset database local, chạy integration tests và xác nhận migrations áp dụng từ đầu không lỗi**
- [ ] **Step 11: Sinh lại `database.types.ts`, chạy advisors và sửa mọi cảnh báo bảo mật/hiệu năng phát sinh từ migration mới**
- [ ] **Step 12: Chạy full test, lint, typecheck và commit `feat: add realtime production database model`**

### Task 3: Repository, validation, service và Server Actions

**Files:**
- Replace: `src/modules/production/types.ts`
- Replace: `src/modules/production/schema.ts`
- Replace: `src/modules/production/repository.ts`
- Replace: `src/modules/production/service.ts`
- Replace: `src/modules/production/actions.ts`
- Replace: `src/modules/production/service.test.ts`
- Create: `src/modules/production/repository.test.ts`

**Interfaces:**
- Produces: `ProductionBoardSnapshot`, `MachineProductionState`, `MachineLogItem`, `MachineProductivitySummary`
- Produces: `getProductionBoard(client, productionDate)` and `getProductionSummary(client, from, to)`
- Produces Server Actions: `startMachine`, `recordHarvest`, `stopMachine`, `setHarvestQuantity`, `correctProductionAction`, `lockProductionDay`, `reopenProductionDay`

- [ ] **Step 1: Viết service tests thất bại cho validation UUID/số bao, chuyển mã lỗi RPC sang thông báo tiếng Việt và payload idempotency**
- [ ] **Step 2: Định nghĩa Zod schemas và types tối thiểu cho bảy thao tác**
- [ ] **Step 3: Viết repository tests thất bại cho việc ghép máy, phiên, harvest, profile thành log riêng từng máy**
- [ ] **Step 4: Cài repository queries và bộ tổng hợp snapshot; không truy vấn bảng sản xuất cũ**
- [ ] **Step 5: Cài service và Server Actions; gọi `revalidatePath('/production')` sau ghi thành công**
- [ ] **Step 6: Kiểm tra quyền quản lý ở cả Next.js và database cho thao tác quản trị**
- [ ] **Step 7: Chạy tests mục tiêu, lint, typecheck và commit `feat: add production application services`**

### Task 4: Machine card và luồng thao tác mobile-first

**Files:**
- Create: `src/components/production/production-board.tsx`
- Create: `src/components/production/machine-production-card.tsx`
- Create: `src/components/production/production-confirm-dialog.tsx`
- Create: `src/components/production/harvest-quantity-form.tsx`
- Create: `src/components/production/production-board.test.tsx`
- Create: `src/components/production/machine-production-card.test.tsx`
- Replace: `src/app/(app)/production/page.tsx`

**Interfaces:**
- `ProductionBoard({ initialSnapshot, currentUser, selectedDate })`
- `MachineProductionCard({ machine, now, online, realtimeReady, readOnly, isManager })`

- [ ] **Step 1: Viết component tests thất bại cho bốn nút, log riêng theo máy và trạng thái chạy/dừng**
- [ ] **Step 2: Viết tests thất bại cho các lý do disable: máy đang chạy, máy chưa chạy, chờ số bao, ngoài giờ, ngày khóa, mất kết nối**
- [ ] **Step 3: Cài card responsive với touch target tối thiểu 44px, trạng thái màu/chữ không phụ thuộc màu đơn độc**
- [ ] **Step 4: Viết tests thất bại cho confirm Bắt đầu/Xả/Tắt, khóa nút khi pending và giữ lỗi đúng card**
- [ ] **Step 5: Cài confirm dialog bằng HTML dialog/form semantics có focus rõ và nút hủy**
- [ ] **Step 6: Viết tests thất bại cho số bao nguyên không âm, 0 hợp lệ, nhắc 30 phút và không tự bật form sau Xả**
- [ ] **Step 7: Cài form nhập số bao inline và dòng log định dạng `Xả đá / N bao · cập nhật lúc ... bởi ...`**
- [ ] **Step 8: Thay page cũ bằng Server Component đọc ngày query, snapshot và render board; bỏ link nhập mẻ/tổng ca**
- [ ] **Step 9: Chạy component tests, lint, typecheck và commit `feat: build realtime production board`**

### Task 5: Realtime, reconnect và đồng hồ sống

**Files:**
- Create: `src/components/production/use-production-realtime.ts`
- Create: `src/components/production/use-production-realtime.test.tsx`
- Modify: `src/components/production/production-board.tsx`

**Interfaces:**
- Produces: `useProductionRealtime(): { online: boolean; realtimeReady: boolean; connectionMessage: string | null }`

- [ ] **Step 1: Viết hook tests thất bại cho `navigator.onLine`, trạng thái `SUBSCRIBED`, lỗi channel, reconnect và cleanup**
- [ ] **Step 2: Cài một private channel `production:machines`, gọi `realtime.setAuth()` trước subscribe và `router.refresh()` khi nhận broadcast**
- [ ] **Step 3: Khi reconnect hoặc channel chuyển `SUBSCRIBED`, gọi refresh để lấy snapshot nguồn sự thật**
- [ ] **Step 4: Thêm timer client cập nhật elapsed/reminder mà không reload database mỗi giây**
- [ ] **Step 5: Khóa thao tác khi offline/chưa đồng bộ, hiển thị banner nguyên nhân và cho xem dữ liệu hiện có**
- [ ] **Step 6: Chạy tests, lint, typecheck và commit `feat: synchronize production board in realtime`**

### Task 6: Công cụ quản lý và lịch sử chỉnh sửa

**Files:**
- Create: `src/components/production/production-day-controls.tsx`
- Create: `src/components/production/production-correction-dialog.tsx`
- Create: `src/components/production/production-audit-history.tsx`
- Create: `src/components/production/production-management.test.tsx`
- Modify: `src/app/(app)/production/page.tsx`
- Modify: `src/modules/audit/repository.ts`

**Interfaces:**
- Manager UI consumes the RPC-backed Server Actions from Task 3.
- Audit view receives immutable `before_data`/`after_data` entries filtered to production entities.

- [ ] **Step 1: Viết tests thất bại cho ẩn controls với nhân viên và hiện controls với quản lý**
- [ ] **Step 2: Cài khóa ngày với điều kiện không còn phiên chạy/lần xả chờ; cài mở lại ngày**
- [ ] **Step 3: Viết tests thất bại cho thêm hành động bỏ sót và sửa giờ hợp lệ/không hợp lệ**
- [ ] **Step 4: Cài correction dialog dùng `datetime-local`, gửi timestamp kèm offset Bangkok và hiển thị lỗi thứ tự từ RPC**
- [ ] **Step 5: Cài lịch sử sửa đổi, hiển thị người, giờ, giá trị cũ/mới; không yêu cầu lý do**
- [ ] **Step 6: Chạy tests, lint, typecheck và commit `feat: add production manager controls`**

### Task 7: Báo cáo, dashboard, backup và loại bỏ luồng cũ

**Files:**
- Modify: `src/modules/reporting/report-data.ts`
- Modify: `src/modules/reporting/repository.ts`
- Modify: `src/modules/reporting/types.ts`
- Modify: `src/modules/reporting/alerts.ts`
- Modify: `src/modules/reporting/alerts.test.ts`
- Modify: `src/modules/reporting/dashboard.test.ts`
- Modify: `src/modules/reporting/excel/reconciliation.test.ts`
- Delete: `src/components/forms/production-batch-form.tsx`
- Delete: `src/components/forms/production-shift-form.tsx`
- Delete: `src/components/production/reconciliation-card.tsx`
- Delete: `src/app/(app)/production/new/batch/page.tsx`
- Delete: `src/app/(app)/production/new/shift-total/page.tsx`
- Delete: `src/modules/production/reconciliation.test.ts`

**Interfaces:**
- Production detail report emits one row per harvest with run start/stop, harvest time, bags and actors.
- Backup table list includes four new production tables and excludes three removed tables.

- [ ] **Step 1: Viết tests thất bại cho KPI sản xuất mới và xác nhận không còn cảnh báo `PRODUCTION_MISMATCH`**
- [ ] **Step 2: Chuyển báo cáo ngày/tháng/chi tiết sang harvest và productivity summary**
- [ ] **Step 3: Cập nhật backup export sang bảng mới và audit/revisions**
- [ ] **Step 4: Xóa routes, forms, reconciliation component và tests của luồng cũ; sửa mọi import/reference còn lại**
- [ ] **Step 5: Chạy `rg` xác nhận code runtime không còn tham chiếu ba bảng cũ hoặc ca sản xuất**
- [ ] **Step 6: Chạy full unit/integration suite, lint, typecheck và commit `refactor: remove legacy production workflow`**

### Task 8: E2E, tài liệu vận hành và Supabase Cloud

**Files:**
- Replace: `tests/e2e/production.spec.ts`
- Modify: `tests/e2e/full-day.spec.ts`
- Modify: `docs/operations/user-acceptance.md`
- Modify: `docs/operations/deployment.md`
- Modify: `README.md`

**Interfaces:**
- E2E mobile: start → harvest → wait-state → quantity → stop and per-machine log.
- E2E desktop manager: correction, audit, lock/reopen and range productivity.

- [ ] **Step 1: Viết Playwright flow mới cho mobile và desktop, gồm cả lý do disable và giá trị 0**
- [ ] **Step 2: Cập nhật hướng dẫn UAT và deployment về migration phá bỏ dữ liệu sản xuất cũ, Realtime private channel và rollback backup**
- [ ] **Step 3: Dùng Supabase MCP truy vấn project đích, số dòng trong ba bảng cũ và ledger liên quan; đối chiếu chính xác phạm vi xóa đã được duyệt**
- [ ] **Step 4: Áp dụng migration lên Supabase Cloud bằng MCP, sinh types từ Cloud và chạy security/performance advisors**
- [ ] **Step 5: Chạy smoke query xác nhận RPC, RLS, bảng mới và số lượng ledger không đổi khi ghi harvest**
- [ ] **Step 6: Chạy `corepack pnpm test`, `corepack pnpm lint`, `corepack pnpm typecheck` và `corepack pnpm build` từ trạng thái sạch**
- [ ] **Step 7: Chạy E2E khi môi trường test khả dụng; nếu không, báo rõ test nào bị skip và lý do**
- [ ] **Step 8: Kiểm tra `git diff --check`, rà yêu cầu trong spec và commit `feat: deliver realtime machine production tracking`**
