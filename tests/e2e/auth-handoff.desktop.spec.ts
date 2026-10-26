import { test, expect, formSignIn } from './helpers'

/**
 * Build-order step 8 — CHS auth return-to-action (§2.1).
 * Desktop: the Activity tab hands off through its guest prompt and the Sign in
 * button returns the user to the page they attempted.
 */
test.describe('desktop auth handoff', () => {
  test('guest taps Activity → signs in from its prompt → returns to notifications', async ({ page }) => {
    await page.goto('/community')

    await page.getByRole('link', { name: 'Activity' }).click()
    await page.waitForURL('**/community/notifications')
    await expect(page.getByText('Sign in to see your activity')).toBeVisible()

    // The prompt's Sign in link carries the attempted destination (§2.1).
    await page.locator('main').getByRole('link', { name: 'Sign in' }).click()
    await page.waitForURL('**/auth/login')

    await formSignIn(page, 'consumer@demo.com', 'demo123')
    await page.waitForURL('**/community/notifications')
  })

  test('guest opens Sign in from Discover → returns to Discover after signing in', async ({ page }) => {
    await page.goto('/community/discover')

    await page.getByRole('link', { name: 'Sign in' }).click()
    await page.waitForURL('**/auth/login')

    await formSignIn(page, 'consumer@demo.com', 'demo123')
    await page.waitForURL('**/community/discover')
  })
})
