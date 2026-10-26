import { test, expect, demoSignIn } from './helpers'

/**
 * Build-order step 8 — mobile layouts.
 * Admin shell (§2.2/§13): four primary bottom-nav sections plus a More sheet
 * listing every remaining permitted section and the View Community shortcut.
 */
test.describe('mobile admin shell', () => {
  test('bottom nav has four primary sections plus a More sheet', async ({ page }) => {
    await demoSignIn(page, 'admin')

    // Visible nav only — the desktop sidebar renders the same aria-label.
    const bottomNav = page.locator('nav[aria-label="Admin sections"]:visible')
    await expect(bottomNav.locator('a')).toHaveCount(4)
    for (const name of ['Overview', 'Moderation', 'Reports', '#Exchange']) {
      await expect(bottomNav.getByRole('link', { name, exact: true })).toBeVisible()
    }

    await bottomNav.getByRole('button', { name: 'More' }).click()
    const sheet = page.getByRole('dialog', { name: 'All admin sections' })
    await expect(sheet).toBeVisible()

    // Every remaining admin section is reachable from the sheet.
    for (const name of [
      'Content',
      'Announcements',
      'Users & Access',
      'Campaigns',
      'Community Managers',
      'Sharing & Attribution',
      'Rewards & Notifications',
      'Analytics & Reporting',
      'Configuration',
      'Membership & Access',
      'Audit Log',
    ]) {
      await expect(sheet.getByRole('link', { name, exact: true })).toBeVisible()
    }
    await expect(sheet.getByRole('link', { name: 'View Community' })).toBeVisible()
  })
})
