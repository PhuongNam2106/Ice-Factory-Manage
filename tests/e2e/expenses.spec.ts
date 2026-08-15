import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_EXPENSES_E2E !== 'true', 'requires isolated local Supabase expense fixtures')

test('chi phí can be entered on a phone viewport and reviewed separately', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/expenses')
  await page.getByRole('link', { name: '+ Nhập chi phí' }).click()
  await expect(page.getByRole('heading', { name: 'Nhập Chi Phí' })).toBeVisible()
  await page.getByLabel('Số tiền (VNĐ)').fill('250000')
  await page.getByLabel('Người nhận').fill('Điện lực')
  await expect(page.getByRole('button', { name: 'Lưu khoản chi' })).toBeVisible()
})
