import { expect, test } from '@playwright/test'

test.describe.skip('legacy inventory archival coverage', () => {
  test('kiểm kho cũ chuyển sang màn hình hao hụt', async ({ page }) => {
    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/loss$/)
  })
})
