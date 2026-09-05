import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_PRODUCTION_E2E !== 'true', 'requires isolated local Supabase production fixtures')
test.use({ viewport: { width: 390, height: 844 } })

test('nhân viên vận hành một máy và nhật ký cập nhật theo thời gian thực', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống|Đăng nhập/ }).click()
  await page.waitForURL('**/')
  await page.goto('/production')
  await expect(page.getByRole('heading', { name: 'Theo dõi máy làm nước đá' })).toBeVisible()

  let machine = page.locator('article').filter({ has: page.getByRole('heading', { level: 2 }) }).first()
  const machineName = await machine.getByRole('heading', { level: 2 }).textContent()
  await machine.getByRole('button', { name: 'Bắt đầu chạy' }).click()
  const startDialog = page.getByRole('dialog')
  await expect(startDialog).toContainText(machineName!)
  await expect(startDialog).toContainText(/\d{2}:\d{2} · \d{2}\/\d{2}\/\d{4}/)
  await startDialog.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(machine.getByText(/Đã ghi nhận bắt đầu chạy/)).toBeVisible()

  await machine.getByRole('button', { name: 'Xả đá' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click()
  await expect(machine.getByText(/Đang chờ tổng kết số bao/)).toBeVisible()
  await expect(machine.getByRole('button', { name: 'Xả đá' })).toBeDisabled()
  await expect(machine.getByText(/chưa có số bao/)).toBeVisible()

  await machine.getByLabel('Số bao của lần xả gần nhất').fill('0')
  await machine.getByRole('button', { name: 'Cập nhật' }).click()
  await machine.getByRole('link', { name: 'Nhật ký máy' }).click()
  await expect(page.getByRole('heading', { name: machineName! })).toBeVisible()
  await expect(page.getByText('Xả đá · 0 bao')).toBeVisible()

  await page.getByRole('link', { name: 'Quay lại danh sách máy' }).click()
  machine = page.locator('article').filter({ has: page.getByRole('heading', { name: machineName! }) })

  await machine.getByRole('button', { name: 'Tắt máy' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click()
  await expect(machine.getByText('■ Đang dừng')).toBeVisible()
})
