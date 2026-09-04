import { expect, test, type Page } from '@playwright/test'
import ExcelJS from 'exceljs'

test.skip(process.env.RUN_FULL_DAY_E2E !== 'true', 'requires pnpm db:reset and an isolated local Supabase project')
test.use({ viewport: { width: 390, height: 844 } })

const customerId = '33333333-3333-4333-8333-333333333333'

async function login(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill(username)
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống|Đăng nhập/ }).click()
  await page.waitForURL('**/')
}

function metric(page: Page, label: string) {
  return page.locator('article').filter({ has: page.getByText(label, { exact: true }) }).first()
}

test('runs one operating day from opening stock to locked report', async ({ page, context }) => {
  test.setTimeout(90_000)
  await login(page, 'nhanvien')

  await page.goto('/production')
  const machine = page.locator('article').filter({ has: page.getByRole('heading', { level: 2 }) }).first()
  await machine.getByRole('button', { name: 'Bắt đầu chạy' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click()
  await machine.getByRole('button', { name: 'Xả đá' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click()
  await machine.getByLabel('Số bao của lần xả gần nhất').fill('50')
  await machine.getByRole('button', { name: 'Cập nhật' }).click()
  await machine.getByRole('button', { name: 'Tắt máy' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click()

  await page.goto('/sales/new/wholesale')
  await page.locator('[name="customerId"]').selectOption(customerId)
  await page.getByLabel('Số bao dòng 1').fill('30')
  await page.getByLabel('Đơn giá dòng 1').fill('7000')
  await page.locator('[name="paidNowVnd"]').fill('0')
  await page.getByRole('button', { name: /Lưu Đơn Bán Sỉ/i }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu thành công đơn bán sỉ')

  await page.goto('/sales/new/retail')
  await page.getByLabel('Số bao dòng 1').fill('20')
  await page.getByLabel('Đơn giá dòng 1').fill('12000')
  await page.getByLabel(/Tổng tiền đã thu/).fill('240000')
  await page.getByRole('button', { name: /Lưu Bán Lẻ Ca/i }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu thành công tổng hợp bán lẻ')

  await page.goto(`/receivables/${customerId}`)
  await page.locator('input[type="number"]').first().fill('100000')
  await page.getByRole('button', { name: /Phân bổ tự động/ }).click()
  await page.getByRole('button', { name: /Lưu Phiếu Thu Tiền/i }).click()
  await expect(page.getByRole('status')).toContainText('Đã lập phiếu thu tiền thành công')

  await page.goto('/expenses/new')
  await page.locator('[name="categoryId"]').selectOption({ index: 1 })
  await page.locator('[name="amountVnd"]').fill('50000')
  await page.locator('[name="payee"]').fill('Điện lực E2E')
  await page.getByRole('button', { name: 'Lưu khoản chi' }).click()
  await expect(page.getByText('Đã lưu khoản chi ở trạng thái Chờ duyệt.')).toBeVisible()

  await page.goto('/')
  await expect(metric(page, 'Doanh thu')).toContainText('450.000 đ')
  await expect(metric(page, 'Tồn thành phẩm')).toContainText('Đầu ngày 100 bao')
  await expect(metric(page, 'Tổng công nợ')).toContainText('110.000 đ')

  await page.goto('/inventory/count')
  await expect(page.getByText('Tồn hệ thống trước kiểm').locator('..')).toContainText('50 bao')
  await page.locator('[name="actualBags"]').fill('50')
  await page.getByRole('button', { name: 'Lưu kết quả kiểm kho' }).click()
  await expect(page.getByText(/Đã lưu kiểm kho/)).toBeVisible()

  await context.clearCookies()
  await login(page, 'quanly')
  await page.goto('/expenses/review')
  await page.getByRole('button', { name: 'Duyệt' }).click()
  await page.goto('/expenses')
  await expect(page.getByText(/Điện lực E2E/).locator('..')).toContainText('Đã duyệt')

  await page.goto('/')
  await expect(metric(page, 'Doanh thu')).toContainText('450.000 đ')
  await expect(metric(page, 'Lợi nhuận tạm tính')).toContainText('400.000 đ')
  await expect(metric(page, 'Tổng công nợ')).toContainText('110.000 đ')
  await expect(metric(page, 'Kiểm kho')).toContainText('Lệch 0 bao')

  await page.goto('/closing')
  await page.locator('a[href^="/closing/"]').first().click()
  await expect(page.getByText(/đã đủ điều kiện khóa sổ/)).toBeVisible()
  await page.getByRole('button', { name: 'Khóa sổ ngày' }).click()
  await expect(page.getByText(/Đã khóa · snapshot/)).toBeVisible()

  await page.goto('/reports')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải Excel Tổng hợp ngày' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  const path = await download.path()
  expect(path).not.toBeNull()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path!)
  const summary = workbook.getWorksheet('Tổng hợp')
  expect(summary?.getCell('B4').value).toBe('locked')
  expect(summary?.getCell('B5').value).toBe(450_000)
  expect(summary?.getCell('B10').value).toBe(400_000)
  expect(summary?.getCell('B11').value).toBe(110_000)
})
