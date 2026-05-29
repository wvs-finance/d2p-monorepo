// Phase 3 Wave 0 — DASH-07 e2e stub (filled by Plan 03-02)
// Note: use test.use({ javaScriptEnabled: false }) in the filled implementation.
import { test } from '@playwright/test'

test.fixme(
  'with javaScriptEnabled:false the dashboard first paint shows skeleton tiles + banner, no wallet gate',
  async () => {
    // When filled by Plan 03-02:
    //   test.use({ javaScriptEnabled: false })
    //   1. Navigate to /apps/abrigo/dashboard with JS disabled
    //   2. Assert response status 200 (RSC first paint is meaningful)
    //   3. Assert skeleton metric tiles are visible in DOM
    //   4. Assert live banner is visible
    //   5. Assert NO wallet connection prompt is visible
    //   6. Assert the page renders without a hydration error
  },
)
