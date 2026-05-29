// Phase 3 Wave 0 — DASH-01 e2e stub (filled by Plan 03-02)
import { test } from '@playwright/test'

test.fixme(
  'GET /api/dashboard?app=abrigo&chain=celo returns 200 with chains[5] and no bigint; ?app=unknown returns 404',
  async () => {
    // When filled by Plan 03-02:
    //   1. Request GET /api/dashboard?app=abrigo&chain=celo
    //   2. Assert response.status() === 200
    //   3. Assert body.chains.length === 5
    //   4. Assert JSON.stringify(body) does not throw (no bigint serialization error)
    //   5. Request GET /api/dashboard?app=unknown
    //   6. Assert response.status() === 404
  },
)
