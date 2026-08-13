import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_RECEIVABLES_E2E !== 'true', 'requires pnpm db:reset and local Supabase fixture')
test.use({ viewport: { width: 390, height: 844 } })

test('nhân viên xem danh sách công nợ và thu nợ khách hàng', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()

  await page.goto('/receivables')
  await expect(page.getByRole('heading', { name: 'Công Nợ & Thu Nợ' })).toBeVisible()
})
