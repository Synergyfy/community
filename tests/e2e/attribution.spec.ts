import type { Page } from '@playwright/test'
import { test, expect, demoSignIn } from './helpers'

/**
 * Build-order step 8 — attribution.
 * A shared link opened with `?ref=<code>` records a visit (Workflow C,
 * §7/§10): the pending visit event shows up on the admin Sharing &
 * Attribution surface, counted as a total — unique clicks stay
 * backend-supplied (§16: shares ≠ visits ≠ outcomes).
 */
async function clicksTotal(page: Page): Promise<number> {
  const card = page.locator('.card').filter({ hasText: 'Clicks (total)' }).first()
  return Number(await card.locator('p.text-xl').innerText())
}

test.describe('attribution journey', () => {
  test('?ref= link visits are recorded and counted on Sharing & Attribution', async ({ page }) => {
    await demoSignIn(page, 'admin')
    await page.goto('/admin/sharing')
    const before = await clicksTotal(page)

    // Open a shared link — the app attempts the tracking endpoint, the blocked
    // API fails fast and the demo fallback persists the pending visit event.
    const visitRequest = page.waitForRequest((req) => req.url().includes('/api/community/track/visit'))
    await page.goto('/community/discover?ref=e2e-visit-1')
    await visitRequest
    await page.waitForTimeout(500) // let the fallback persist the event

    await page.goto('/admin/sharing')
    const after = await clicksTotal(page)
    expect(after).toBe(before + 1)
  })
})
