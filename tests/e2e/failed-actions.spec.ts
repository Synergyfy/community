import { test, expect, demoSignIn } from './helpers'

/**
 * Build-order step 8 — failed actions.
 * Invalid input and duplicate configuration entries fail loudly with inline
 * messages and change nothing — on every surface (§16: a failed action must
 * not create a half-record).
 */
test.describe('failed actions', () => {
  test('the sign-in form rejects invalid email and short passwords inline', async ({ page }) => {
    await page.goto('/auth/login')

    // First rule: a valid email format is required.
    await page.locator('#login-email').fill('not-an-email')
    await page.locator('#login-password').fill('demo123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()

    // Fix the email — the password rule is next (one inline message at a time).
    await page.locator('#login-email').fill('someone@example.com')
    await page.locator('#login-password').fill('123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible()

    // Still on the login page — nothing was submitted.
    await expect(page).toHaveURL(/\/auth\/login$/)
  })

  test('duplicate report reasons are refused on Configuration', async ({ page }) => {
    await demoSignIn(page, 'admin')
    await page.goto('/admin/config')

    const addReason = page.locator('input[aria-label="New report reason"]')
    await addReason.fill('Spam or misleading')
    // The add button sits directly beside the input (Community categories has its own 'Add').
    await page.locator('input[aria-label="New report reason"] + button').click()

    await expect(page.getByText('That reason already exists.')).toBeVisible()

    // The reason list is unchanged — still the six seeded reasons.
    const seeded = ['Spam or misleading', 'Harassment or bullying', 'Hate speech', 'Violence or dangerous content', 'False information', 'Something else']
    for (const label of seeded) {
      await expect(page.getByRole('button', { name: `Remove reason ${label}` })).toBeVisible()
    }
  })
})
