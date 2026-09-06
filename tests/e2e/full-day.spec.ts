import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import ExcelJS from 'exceljs'
import type { Database } from '@/lib/supabase/database.types'
import { usernameToAuthEmail } from '@/modules/auth/schema'
import { getOperatingDay } from '@/modules/shared/operating-day'

const firstDay = '2026-09-05'
const nextDay = '2026-09-06'
const customerId = '33333333-3333-4333-8333-333333333333'
const machineId = '55555555-5555-4555-8555-555555555555'
const employeeId = '11111111-1111-1111-1111-111111111111'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

function isIsolatedLocalDatabase(url?: string) {
  if (!url) return false
  try {
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

test.skip(
  process.env.RUN_FULL_DAY_E2E !== 'true'
    || !isIsolatedLocalDatabase(supabaseUrl)
    || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'requires pnpm db:reset and an isolated local Supabase project',
)
test.use({ viewport: { width: 390, height: 844 } })

async function login(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill(username)
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống|Đăng nhập/ }).click()
  await page.waitForURL('**/')
}

async function prepareOperatingDays() {
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  const admin = createClient<Database>(supabaseUrl!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options)
  const employee = createClient<Database>(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options)
  const manager = createClient<Database>(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options)

  expect((await employee.auth.signInWithPassword({ email: usernameToAuthEmail('nhanvien'), password: '123456' })).error).toBeNull()
  expect((await manager.auth.signInWithPassword({ email: usernameToAuthEmail('quanly'), password: '123456' })).error).toBeNull()

  expect((await admin.from('settings').update({
    operating_day_cutover_at: '2026-09-05T13:00:00.000Z',
    loss_warning_pct: 5,
  }).eq('id', true)).error).toBeNull()
  expect((await admin.from('operating_days').upsert([
    { day: firstDay, status: 'open' },
    { day: nextDay, status: 'open' },
  ], { onConflict: 'day' })).error).toBeNull()

  const { data: productionDays, error: productionDaysError } = await admin.from('production_days').insert([
    { production_date: firstDay, starts_at: '2026-09-05T13:00:00.000Z', ends_at: '2026-09-06T13:00:00.000Z' },
    { production_date: nextDay, starts_at: '2026-09-06T13:00:00.000Z', ends_at: '2026-09-07T13:00:00.000Z' },
  ]).select('id, production_date')
  expect(productionDaysError).toBeNull()
  const firstProductionDayId = productionDays!.find((day) => day.production_date === firstDay)!.id
  const nextProductionDayId = productionDays!.find((day) => day.production_date === nextDay)!.id

  const { data: runs, error: runsError } = await admin.from('machine_runs').insert([
    {
      machine_id: machineId,
      production_day_id: firstProductionDayId,
      started_at: '2026-09-05T13:10:00.000Z',
      stopped_at: '2026-09-06T12:55:00.000Z',
      started_by: employeeId,
      stopped_by: employeeId,
    },
    {
      machine_id: machineId,
      production_day_id: nextProductionDayId,
      started_at: '2026-09-06T13:00:01.000Z',
      stopped_at: '2026-09-06T15:00:00.000Z',
      started_by: employeeId,
      stopped_by: employeeId,
    },
  ]).select('id, production_day_id')
  expect(runsError).toBeNull()
  const firstRunId = runs!.find((run) => run.production_day_id === firstProductionDayId)!.id
  const nextRunId = runs!.find((run) => run.production_day_id === nextProductionDayId)!.id
  expect((await admin.from('machine_harvests').insert([
    { machine_id: machineId, machine_run_id: firstRunId, harvested_at: '2026-09-05T14:00:00.000Z', harvested_by: employeeId, bag_quantity: 250, quantity_updated_at: '2026-09-05T14:35:00.000Z', quantity_updated_by: employeeId },
    { machine_id: machineId, machine_run_id: firstRunId, harvested_at: '2026-09-06T12:30:00.000Z', harvested_by: employeeId, bag_quantity: 250, quantity_updated_at: '2026-09-06T12:55:00.000Z', quantity_updated_by: employeeId },
    { machine_id: machineId, machine_run_id: nextRunId, harvested_at: '2026-09-06T14:00:00.000Z', harvested_by: employeeId, bag_quantity: 100, quantity_updated_at: '2026-09-06T14:35:00.000Z', quantity_updated_by: employeeId },
  ])).error).toBeNull()

  const sales = await Promise.all([
    employee.rpc('create_sale', {
      p_input: { kind: 'wholesale', occurredAt: '2026-09-05T14:00:00.000Z', customerId, lines: [{ quantityBags: 300, unitPriceVnd: 7000 }], paidNowVnd: 0, paymentMethod: 'cash' },
      p_idempotency_key: crypto.randomUUID(),
    }),
    employee.rpc('create_sale', {
      p_input: { kind: 'retail', occurredAt: '2026-09-06T12:50:00.000Z', shiftCode: 'FULL-DAY-LATE', lines: [{ quantityBags: 150, unitPriceVnd: 12000 }], paidNowVnd: 1_800_000, paymentMethod: 'cash' },
      p_idempotency_key: crypto.randomUUID(),
    }),
    employee.rpc('create_sale', {
      p_input: { kind: 'retail', occurredAt: '2026-09-06T13:00:00.000Z', shiftCode: 'FULL-DAY-BOUNDARY', lines: [{ quantityBags: 1, unitPriceVnd: 12000 }], paidNowVnd: 12_000, paymentMethod: 'cash' },
      p_idempotency_key: crypto.randomUUID(),
    }),
  ])
  for (const sale of sales) expect(sale.error).toBeNull()

  const { data: category, error: categoryError } = await admin.from('expense_categories').select('id').eq('code', 'electricity').single()
  expect(categoryError).toBeNull()
  const expense = await employee.rpc('create_expense', {
    p_input: { occurredAt: '2026-09-06T12:55:00.000Z', categoryId: category!.id, amountVnd: 50_000, payee: 'Điện lực E2E', note: 'Chi phí ngày kiểm thử' },
    p_idempotency_key: crypto.randomUUID(),
  })
  expect(expense.error).toBeNull()
  expect((await manager.rpc('review_expense', {
    p_expense_id: (expense.data as { expenseId: string }).expenseId,
    p_decision: 'approved',
  })).error).toBeNull()
  const currentExpense = await employee.rpc('create_expense', {
    p_input: { categoryId: category!.id, amountVnd: 1, payee: 'Nhập nhanh E2E', note: 'Dùng giờ máy chủ' },
    p_idempotency_key: crypto.randomUUID(),
  })
  expect(currentExpense.error).toBeNull()
  const storedCurrentExpense = await admin.from('expenses')
    .select('operating_day, occurred_at')
    .eq('id', (currentExpense.data as { expenseId: string }).expenseId)
    .single()
  expect(storedCurrentExpense.error).toBeNull()
  expect(storedCurrentExpense.data?.operating_day).toBe(
    getOperatingDay(new Date(storedCurrentExpense.data!.occurred_at)),
  )

  const { data: storedSales, error: storedSalesError } = await admin.from('sales')
    .select('operating_day, occurred_at')
    .in('occurred_at', ['2026-09-05T14:00:00.000Z', '2026-09-06T12:50:00.000Z', '2026-09-06T13:00:00.000Z'])
    .order('occurred_at')
  expect(storedSalesError).toBeNull()
  expect(storedSales?.map((sale) => sale.operating_day)).toEqual([firstDay, firstDay, nextDay])

  await Promise.all([employee.auth.signOut(), manager.auth.signOut()])
}

test('records and closes daily production loss', async ({ page, context }) => {
  test.setTimeout(120_000)
  await prepareOperatingDays()
  await login(page, 'nhanvien')

  await page.goto(`/loss/${firstDay}`)
  await page.getByLabel('Tồn đầu ngày').fill('100')
  await page.getByLabel('Tồn cuối thực tế').fill('140')
  await page.getByRole('button', { name: 'Lưu đối soát' }).click()
  await expect(page.getByText(/Hao hụt 10 bao/).first()).toBeVisible()
  await expect(page.getByText(/2%/).first()).toBeVisible()

  await context.clearCookies()
  await login(page, 'quanly')
  await page.goto(`/closing/${firstDay}`)
  await expect(page.getByText(/đã đủ điều kiện khóa sổ/)).toBeVisible()
  await page.getByRole('button', { name: 'Khóa sổ ngày' }).click()
  await expect(page.getByText(/Trạng thái: Đã khóa · snapshot/)).toBeVisible()

  await context.clearCookies()
  await login(page, 'nhanvien')
  await page.goto(`/loss/${nextDay}`)
  await expect(page.getByText('Tồn đầu kế thừa').locator('..').getByText('140 bao')).toBeVisible()
  await page.getByLabel('Tồn cuối thực tế').fill('200')
  await page.getByRole('button', { name: 'Lưu đối soát' }).click()
  await expect(page.getByText(/Hao hụt 39 bao/).first()).toBeVisible()

  await context.clearCookies()
  await login(page, 'quanly')
  await page.goto(`/closing/${nextDay}`)
  await page.getByRole('button', { name: 'Xác nhận cảnh báo hao hụt' }).click()
  await expect(page.getByText(/Đã xác nhận cảnh báo hao hụt/)).toBeVisible()
  await page.goto(`/loss/${nextDay}`)
  await expect(page.getByRole('heading', { name: 'Lịch sử chỉnh sửa' })).toBeVisible()
  await expect(page.getByText('Phiên bản 2')).toBeVisible()

  await page.goto('/inventory')
  await expect(page).toHaveURL(/\/loss$/)
  await page.goto('/inventory/count')
  await expect(page).toHaveURL(/\/loss$/)

  await page.goto('/reports')
  const dailyReport = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Tổng hợp ngày' }) })
  await dailyReport.locator('input[name="from"]').fill(firstDay)
  const downloadPromise = page.waitForEvent('download')
  await dailyReport.getByRole('button', { name: 'Tải Excel Tổng hợp ngày' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).not.toBeNull()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path!)
  const summary = workbook.getWorksheet('Tổng hợp')
  expect(summary?.getCell('B4').value).toBe('locked')
  expect(summary?.getCell('B5').value).toBe(3_900_000)
  expect(summary?.getCell('B10').value).toBe(3_850_000)
  expect(summary?.getCell('B11').value).toBe(2_100_000)
  expect(summary?.getCell('B12').value).toBe(500)
  expect(summary?.getCell('B13').value).toBe(450)
  expect(summary?.getCell('B14').value).toBe(10)
  expect(summary?.getCell('B15').value).toBe(2)
})
