import { test, expect, demoSignIn } from './helpers'

/**
 * Build-order step 8 — layouts (desktop).
 * Admin shell (§13): the desktop side menu lists every permitted admin
 * section plus the View Community footer shortcut.
 */
test.describe('desktop admin shell', () => {
  test('sidebar lists every admin section', async ({ page }) => {
    await demoSignIn(page, 'admin')

    const sidebar = page.locator('aside')
    const nav = sidebar.locator('nav[aria-label="Admin sections"]')
    await expect(nav.getByRole('link')).toHaveCount(15)

    for (const name of ['Overview', 'Content', 'Community Managers', 'Membership & Access', 'Audit Log']) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
    }
    await expect(sidebar.getByRole('link', { name: 'View Community' })).toBeVisible()
  })
})
