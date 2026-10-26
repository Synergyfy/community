import { test, expect, demoSignIn } from './helpers'

/**
 * Build-order step 8 — permissions.
 * Route guard (§2.1): /admin requires an admin account — guests are sent to
 * sign-in, signed-in members see an access-denied page. Audience rules
 * (§4.1/§5.1): business-only exchanges are hidden from everyone but
 * businesses, and the front end mirrors what the server must enforce.
 */
test.describe('permissions', () => {
  test('signed-out visitors are redirected from /admin to sign-in', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('**/auth/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('a consumer account opening /admin sees access denied', async ({ page }) => {
    await demoSignIn(page, 'consumer')
    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible()
    await expect(page.getByText("You don't have permission to access this page.")).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Community' })).toBeVisible()
  })

  test('business-only exchanges are hidden from the public list but visible to businesses', async ({ page }) => {
    await page.goto('/community/discover/exchanges')
    await expect(page.getByText('Meeting space for marketing support')).toBeVisible()
    await expect(page.getByText('Wholesale flower stock for retail display help')).toHaveCount(0)

    await demoSignIn(page, 'business')
    await page.goto('/community/discover/exchanges')
    await expect(page.getByText('Wholesale flower stock for retail display help')).toBeVisible()
  })
})
