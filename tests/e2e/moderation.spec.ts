import { test, expect, demoSignIn } from './helpers'

/**
 * Build-order step 8 — moderation.
 * One record, every surface (§15): an admin rejects a published business post
 * with a reason; the same record shows the rejection to its author, disappears
 * from public surfaces, and lands in the audit log. Also covers a failed
 * action: rejecting without a reason is refused (§5.2).
 *
 * The demo post stores are in-memory by design (config/audit persist, posts
 * reset on a hard reload), so the account switches below travel through the
 * app with in-page navigation only — one session, one record.
 */
test.describe('moderation journey', () => {
  test('a rejection flows through admin, business, public feed and audit as one record', async ({ page }) => {
    const reason = 'E2E moderation check — not allowed.'

    // 1. Admin rejects the published post — and an empty reason is refused.
    await demoSignIn(page, 'admin')
    await page.goto('/admin/content')

    const card = page.locator('.card').filter({ hasText: 'Fresh brews every morning' }).first()
    await card.scrollIntoViewIfNeeded()
    await card.getByRole('button', { name: 'Reject' }).click()

    await expect(page.getByText('Reject with reason')).toBeVisible()
    await page.getByRole('button', { name: 'Reject post' }).click()
    await expect(page.getByText('A moderation reason is required (§5.2).')).toBeVisible()

    await page.getByPlaceholder('e.g. Promotional posts require an approved offer or campaign.').fill(reason)
    await page.getByRole('button', { name: 'Reject post' }).click()

    await expect(card.getByText('rejected', { exact: true })).toBeVisible()
    await expect(card.getByText(`Rejection reason: ${reason}`)).toBeVisible()

    // 2. The author sees the same record in their Rejected tab with the reason.
    await page.locator('aside').getByRole('link', { name: 'View Community' }).click()
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.locator('header').getByRole('link', { name: 'Sign in' }).click()
    await page.getByRole('button', { name: 'business', exact: true }).click()
    await page.waitForURL('**/business/dashboard')

    await page.getByRole('link', { name: 'Posts', exact: true }).click()
    await page.getByRole('button', { name: 'Rejected' }).click()
    // The seeded rejected demo post and the newly rejected one both show the callout.
    await expect(page.getByText('Rejected by moderators').first()).toBeVisible()
    await expect(page.getByText(reason)).toBeVisible()

    // 3. Public visitors no longer see the post at all. Logging out from the
    //    protected dashboard returns to sign-in (return-to-action); the guest
    //    header takes us to the public feed.
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.waitForURL(/\/auth\/login$/)
    await page.locator('header').getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page).toHaveURL(/\/community$/)
    await expect(page.getByText('Fresh brews every morning')).toHaveCount(0)

    // 4. The audit log records the same action with its reason.
    await page.locator('header').getByRole('link', { name: 'Sign in' }).click()
    await page.getByRole('button', { name: 'admin', exact: true }).click()
    await page.waitForURL('**/admin')
    await page.locator('aside').getByRole('link', { name: 'Audit Log' }).click()
    await expect(page.getByText(/Reason: E2E moderation check/)).toBeVisible()
  })
})
