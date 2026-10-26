import { test as base, expect, type Page } from '@playwright/test'

export { expect }

/**
 * Community services try the real API first (`/api/...`) and fall back to the
 * demo stores when it fails (there is no backend in this repo). Fulfil API
 * calls with an immediate 502 so those fallbacks run quickly and
 * deterministically — this is also the honest demo-mode behaviour every
 * journey below relies on.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: '{"error":"no backend (e2e demo mode)"}',
      }),
    )
    await use(page)
  },
})

const ROLE_HOME: Record<'business' | 'admin' | 'consumer' | 'manager', string> = {
  business: '/business/dashboard',
  admin: '/admin',
  consumer: '/community',
  manager: '/manager',
}

/** Quick demo sign-in from the login page (forces the role's home surface). */
export async function demoSignIn(page: Page, role: 'business' | 'admin' | 'consumer' | 'manager'): Promise<void> {
  await page.goto('/auth/login')
  await page.getByRole('button', { name: role, exact: true }).click()
  const home = ROLE_HOME[role]
  await page.waitForURL((url) => url.pathname === home || url.pathname.startsWith(`${home}/`))
}

/** Regular form sign-in — honours return-to-action (spec §2.1). */
export async function formSignIn(page: Page, email: string, password: string): Promise<void> {
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Sign out through the public shell's account menu. */
export async function logOut(page: Page): Promise<void> {
  await page.goto('/community')
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.locator('header').getByRole('link', { name: 'Sign in' })).toBeVisible()
}
