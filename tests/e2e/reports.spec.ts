import { expect, test } from '@playwright/test'

test('xuất Excel hợp lệ và chặn employee khỏi audit/backup', async ({ page }) => {
  test.skip(process.env.RUN_REPORTS_E2E !== 'true', 'Cần tài khoản E2E và Supabase đã seed.')

  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill('nhanvien')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống/ }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Xuất báo cáo' })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải Excel Tổng hợp ngày' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^(Báo cáo ngày |bao-cao-ngay-)\d{4}-\d{2}-\d{2}\.xlsx$/)

  expect((await page.request.get('/api/reports/audit?from=2026-08-01&to=2026-08-31')).status()).toBe(403)
  expect((await page.request.get('/api/reports/backup')).status()).toBe(403)
})
