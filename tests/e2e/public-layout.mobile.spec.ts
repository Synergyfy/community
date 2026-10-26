import { test, expect, formSignIn } from './helpers'

/**
 * Build-order step 8 — mobile layouts + CHS auth return-to-action.
 * Public shell (spec §2.2): a fixed mobile bottom nav with exactly five
 * primary destinations, and guest Activity/Profile taps that hand off to
 * sign-in and return to the attempted destination (§2.1).
 */
test.describe('mobile public shell', () => {
  test('bottom nav shows exactly five destinations', async ({ page }) => {
    await page.goto('/community')

    const bottomNav = page.locator('nav.fixed')
    await expect(bottomNav).toHaveCount(1)
    await expect(bottomNav).toBeVisible()

    const labels = await bottomNav.locator('span').allTextContents()
    expect(labels).toEqual(['Home', 'Discover', '#Exchange', 'Activity', 'Profile'])
  })

  test('guest taps Activity → sign in → returns to notifications', async ({ page }) => {
    await page.goto('/community')

    await page.getByRole('button', { name: 'Activity' }).click()
    await page.waitForURL('**/auth/login')

    await formSignIn(page, 'consumer@demo.com', 'demo123')
    await page.waitForURL('**/community/notifications')
  })

  test('guest taps Profile → sign in → returns to profile', async ({ page }) => {
    await page.goto('/community')

    await page.getByRole('button', { name: 'Profile' }).click()
    await page.waitForURL('**/auth/login')

    await formSignIn(page, 'consumer@demo.com', 'demo123')
    await page.waitForURL('**/community/profile')
  })
})
