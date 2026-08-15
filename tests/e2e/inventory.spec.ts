import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_INVENTORY_E2E !== 'true', 'requires isolated local Supabase inventory fixtures')

test('kiểm kho shows expected, actual and signed variance', async ({ page }) => {
  await page.goto('/inventory')
  await expect(page.getByRole('heading', { name: 'Tồn Kho Nước Đá' })).toBeVisible()
  await page.getByRole('link', { name: '+ Kiểm kho' }).click()
  await expect(page.getByText('Tồn hệ thống trước kiểm')).toBeVisible()
  await page.getByLabel('Số bao đếm thực tế').fill('100')
  await page.getByRole('button', { name: 'Lưu kết quả kiểm kho' }).click()
  await expect(page.getByText(/Đã lưu kiểm kho|Đã lưu và điều chỉnh/)).toBeVisible()
})
