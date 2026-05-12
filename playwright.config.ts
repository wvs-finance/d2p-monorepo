import { defineConfig, devices } from '@playwright/test'

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:3000'

const webServer = process.env.CI
  ? undefined
  : {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    }

export default defineConfig({
  testDir: './tests',
  // Playwright runs ONLY browser-based specs in e2e/ and a11y/.
  // Architecture, unit, and api directories are excluded — they use .test.ts and run in Vitest.
  testIgnore: ['**/unit/**', '**/api/**', '**/architecture/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['e2e/**/*.spec.ts'],
    },
    {
      name: 'axe',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['a11y/**/*.spec.ts'],
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['visual/**/*.spec.ts'],
    },
  ],
  ...(webServer ? { webServer } : {}),
})
