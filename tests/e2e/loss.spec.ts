import { expect, test, type Page } from '@playwright/test'

test.skip(process.env.RUN_LOSS_E2E !== 'true', 'requires pnpm db:reset and an isolated local Supabase project')

async function login(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Tên tài khoản').fill(username)
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: /Vào hệ thống|Đăng nhập/ }).click()
  await page.waitForURL('**/')
}

test.describe.serial('hao hụt hằng ngày', () => {
  test('employee saves closing stock and manager sees immutable versions', async ({ page, context }) => {
    await login(page, 'nhanvien')
    await page.goto('/loss')
    await expect(page.getByRole('heading', { name: 'Theo dõi hao hụt sản xuất' })).toBeVisible()

    const opening = page.getByLabel('Tồn đầu ngày')
    if (await opening.isVisible()) await opening.fill('100')
    await page.getByLabel('Tồn cuối thực tế').fill('90')
    await page.getByRole('button', { name: /Lưu đối soát|Cập nhật đối soát/ }).click()
    await expect(page.getByText(/Hao hụt 10 bao|Dư kho|Khớp kho/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lịch sử đối soát' })).toBeVisible()

    const detailHref = await page.locator('a[href^="/loss/"]').first().getAttribute('href')
    expect(detailHref).toMatch(/^\/loss\/\d{4}-\d{2}-\d{2}$/)

    await context.clearCookies()
    await login(page, 'quanly')
    await page.goto(detailHref!)
    await expect(page.getByRole('heading', { name: 'Lịch sử chỉnh sửa' })).toBeVisible()
    await expect(page.getByText('Phiên bản 1')).toBeVisible()
  })

  test('legacy inventory routes redirect to loss', async ({ page }) => {
    await login(page, 'nhanvien')
    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/loss$/)
    await page.goto('/inventory/count')
    await expect(page).toHaveURL(/\/loss$/)
  })

  test('mobile loss screen stays within the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, 'nhanvien')
    await page.goto('/loss')
    await expect(page.getByRole('navigation', { name: 'Điều hướng di động' }).getByRole('link', { name: 'Hao hụt' })).toBeVisible()
    const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
    expect(widths.scroll).toBeLessThanOrEqual(widths.client)
  })
})
