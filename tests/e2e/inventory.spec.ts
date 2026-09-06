import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_INVENTORY_E2E !== 'true', 'requires isolated local Supabase inventory fixtures')

test('kiểm kho cũ chuyển sang màn hình hao hụt', async ({ page }) => {
  await page.goto('/inventory')
  await expect(page).toHaveURL(/\/loss$/)
})
