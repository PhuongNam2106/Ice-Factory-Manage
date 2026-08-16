import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_DASHBOARD_E2E !== 'true', 'requires authenticated dashboard fixtures')

test('dashboard fits phone and desktop without horizontal overflow', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Nhịp xưởng hôm nay' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})
