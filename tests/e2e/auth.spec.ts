import { expect, test } from '@playwright/test'

test('employee cannot open user administration', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Số điện thoại').fill('0912345678')
  await page.getByLabel('Mã PIN').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/(?:$|login)/)
})
