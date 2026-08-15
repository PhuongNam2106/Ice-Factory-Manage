import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_CLOSING_E2E !== 'true', 'requires isolated local Supabase closing fixtures')

test('khóa sổ shows reconciliation before manager confirmation', async ({ page }) => {
  await page.goto('/closing')
  await expect(page.getByRole('heading', { name: 'Đối Chiếu & Khóa Sổ' })).toBeVisible()
  await page.locator('a[href^="/closing/"]').first().click()
  await expect(page.getByRole('heading', { name: /Đối Chiếu/ })).toBeVisible()
})
