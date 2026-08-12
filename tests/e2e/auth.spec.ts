import { expect, test } from '@playwright/test'

test('employee cannot open user administration', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/(?:$|login)/)
})
