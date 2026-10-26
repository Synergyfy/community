import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end journeys for the Community front end (spec build-order step 8).
 *
 * The app runs in demo mode: every service first attempts the real API and
 * falls back to demo/localStorage data when it fails. There is no backend in
 * this repo, so the specs block `/api/**` with an immediate 502 and the demo
 * fallbacks run fast and deterministically.
 *
 * Two viewport projects cover the layout requirements:
 *   - desktop  → side-menu admin shell, desktop header nav
 *   - mobile   → five-tab public bottom nav, admin bottom nav + More sheet
 * Specs named *.mobile.spec.ts run only on the mobile project; everything
 * else runs only on desktop.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5299',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/*.mobile.spec.ts',
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/*.mobile.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5299 --strictPort',
    url: 'http://localhost:5299',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
