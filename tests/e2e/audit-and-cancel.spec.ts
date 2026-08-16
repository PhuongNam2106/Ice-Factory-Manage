import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_AUDIT_E2E !== 'true', 'Cần pnpm db:reset và Supabase local đã seed.')

test('nhân viên hủy chứng từ của mình và quản lý xem lịch sử', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống/ }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/sales/new/retail')
  await page.getByLabel('Mã ca / Phiên bán lẻ').fill(`HUY-${Date.now()}`)
  await page.getByLabel('Số bao dòng 1').fill('1')
  await page.getByLabel('Đơn giá dòng 1').fill('10000')
  await page.getByLabel('Tổng tiền đã thu').fill('10000')
  await page.getByRole('button', { name: 'Lưu Bán Lẻ Ca' }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu thành công')

  await page.goto('/sales')
  await page.getByRole('button', { name: 'Hủy chứng từ' }).first().click()
  await page.getByLabel('Lý do hủy').fill('Nhập thử để kiểm tra lịch sử hủy')
  await page.getByRole('button', { name: 'Hủy và ghi bút toán đảo' }).click()
  await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Đăng xuất/ }).click()
  await page.getByLabel('Tên tài khoản').fill('quanly')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống/ }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/admin/audit?action=sale.cancelled')
  await expect(page.getByRole('heading', { name: 'Lịch sử audit' })).toBeVisible()
  await expect(page.getByText('sale.cancelled').first()).toBeVisible()
  await expect(page.getByText('Nhập thử để kiểm tra lịch sử hủy').first()).toBeVisible()
})
