import { defineConfig, devices } from '@playwright/test'

// A remote target (CI deployment_status → Vercel URL) is set via PLAYWRIGHT_TEST_BASE_URL.
// When present we test the DEPLOYED build directly and must NOT spin up a local webServer
// (a local `pnpm build` on CI fails because the NEXT_PUBLIC_* env is Vercel-only — this was
// the test-e2e CI break). When absent we fall back to a local prod server for dev.
const REMOTE_TARGET = process.env.PLAYWRIGHT_TEST_BASE_URL ?? process.env.BASE_URL
const BASE_URL = REMOTE_TARGET ?? 'http://localhost:3040'

// Vercel Deployment Protection (SSO) 401s preview URLs; the automation-bypass secret, when
// provided, is sent on every request so e2e/a11y can reach a protected preview.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const extraHTTPHeaders = bypass
  ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' }
  : undefined

// Production build is the ground truth for force-dynamic route-segment config (Pitfall 5).
// pnpm dev (Turbopack) can honor route config differently from the webpack production build —
// the Phase-2 burn class. Only used for LOCAL runs (no remote target).
const webServer = REMOTE_TARGET
  ? undefined
  : {
      command: 'pnpm build && pnpm start -p 3040',
      url: 'http://localhost:3040',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
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
    ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
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
  // Only attach webServer for local runs; omit entirely when testing a remote target.
  ...(webServer ? { webServer } : {}),
})
