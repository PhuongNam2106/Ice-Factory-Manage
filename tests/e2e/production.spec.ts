import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_PRODUCTION_E2E !== 'true', 'requires isolated local Supabase production fixtures')
test.use({ viewport: { width: 390, height: 844 } })

test('nhân viên nhập sản xuất và thấy thẻ đối soát không tính trùng', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Vào hệ thống →' }).click()
  await page.waitForURL('**/')
  await page.goto('/production')
  await expect(page.getByRole('heading', { name: 'Sản Xuất Nước Đá' })).toBeVisible()

  await page.getByRole('link', { name: /Nhập từng mẻ/ }).click()
  await page.getByLabel('Bắt đầu').fill('06:00')
  await page.getByLabel('Kết thúc').fill('10:00')
  await page.getByLabel('Số bao đạt').fill('120')
  await page.getByRole('button', { name: 'Lưu mẻ sản xuất' }).click()
  await expect(page.getByText('Đã lưu mẻ sản xuất.')).toBeVisible()

  await page.goto('/production/new/shift-total')
  await page.getByLabel('Tổng số bao đạt').fill('125')
  await page.getByRole('button', { name: 'Lưu tổng cuối ca' }).click()
  await expect(page.getByText('Đã lưu tổng cuối ca.')).toBeVisible()

  await page.goto('/production')
  await expect(page.getByText('Tổng từng mẻ').locator('..').getByText('120 bao')).toBeVisible()
  await expect(page.getByText('Tổng cuối ca').locator('..').getByText('125 bao')).toBeVisible()
  await expect(page.getByText('Đang chờ quản lý xác nhận nguồn chính thức.')).toBeVisible()
})
