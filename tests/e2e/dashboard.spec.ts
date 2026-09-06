import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_DASHBOARD_E2E !== 'true', 'requires authenticated dashboard fixtures')

test('dashboard fits phone and desktop without horizontal overflow', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống|Đăng nhập/ }).click()
  await page.waitForURL('**/')
  for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Nhịp xưởng hôm nay' })).toBeVisible()
    await expect(page.getByText('Tồn cuối', { exact: true })).toBeVisible()
    await expect(page.locator('article').filter({ has: page.getByText(/Hao hụt|Dư kho/, { exact: true }) }).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
})
