// Phase 3 — DASH-08 e2e: /status human-readable RSC page + /api/status JSON route (filled by Plan 03-03)
import { expect, test } from '@playwright/test'

test.describe('DASH-08 — /status human-readable page', () => {
  test('GET /status returns 200', async ({ page }) => {
    const response = await page.goto('/status')
    expect(response?.status()).toBe(200)
  })

  test('/status renders exactly 5 per-chain health rows', async ({ page }) => {
    await page.goto('/status')
    const rows = page.getByTestId('chain-health-list').locator('li')
    await expect(rows).toHaveCount(5)
  })

  test('/status: each chain row has a status pill with visible text (CROSS-09 color+icon+text)', async ({
    page,
  }) => {
    await page.goto('/status')
    const rows = page.getByTestId('chain-health-list').locator('li')
    const count = await rows.count()
    // All 5 rows must be present
    expect(count).toBe(5)

    // For each row, an <output> element (StatusPill renders as <output>) must be present
    // containing either the healthy or degraded label text — never color alone (CROSS-09)
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const pill = row.locator('output')
      await expect(pill).toBeVisible()
      // Pill text must be non-empty (encodes the status as text)
      const pillText = await pill.textContent()
      expect(pillText?.trim().length).toBeGreaterThan(0)
    }
  })

  test('/status: celo chain row is present', async ({ page }) => {
    await page.goto('/status')
    const celoRow = page.getByTestId('chain-row-celo')
    await expect(celoRow).toBeVisible()
  })

  test('/status: ethereum chain row is present', async ({ page }) => {
    await page.goto('/status')
    const ethRow = page.getByTestId('chain-row-ethereum')
    await expect(ethRow).toBeVisible()
  })

  test('/status: base chain row is present', async ({ page }) => {
    await page.goto('/status')
    const baseRow = page.getByTestId('chain-row-base')
    await expect(baseRow).toBeVisible()
  })

  test('/status: arbitrum one chain row is present', async ({ page }) => {
    await page.goto('/status')
    // viem names it "Arbitrum One"
    const arbRow = page.getByTestId(/chain-row-arbitrum/i)
    await expect(arbRow.first()).toBeVisible()
  })

  test('/status: optimism chain row is present', async ({ page }) => {
    await page.goto('/status')
    const opRow = page
      .getByTestId('chain-row-op-mainnet')
      .or(page.getByTestId('chain-row-optimism'))
    await expect(opRow.first()).toBeVisible()
  })

  test('/status: build hash field is visible and non-empty', async ({ page }) => {
    await page.goto('/status')
    const buildHashEl = page.getByTestId('build-hash')
    await expect(buildHashEl).toBeVisible()
    const text = await buildHashEl.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('/status: freshness timestamp field is visible and non-empty', async ({ page }) => {
    await page.goto('/status')
    const freshnessEl = page.getByTestId('freshness-timestamp')
    await expect(freshnessEl).toBeVisible()
    const text = await freshnessEl.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('/status: Abrigo app row renders with pre-launch pill', async ({ page }) => {
    await page.goto('/status')
    const abrigoRow = page.getByTestId('app-row-abrigo')
    await expect(abrigoRow).toBeVisible()
    // Row must contain an <output> pill with non-empty text
    const pill = abrigoRow.locator('output')
    await expect(pill).toBeVisible()
    const pillText = await pill.textContent()
    expect(pillText?.trim().length).toBeGreaterThan(0)
  })

  test('/status: page renders even when a chain may be degraded (no all-or-nothing blank)', async ({
    page,
  }) => {
    // Strict isolation (single-failing-probe) is owned by the Task 1 unit test.
    // This e2e asserts the page renders 5 rows without a runtime error regardless of live RPC state.
    const response = await page.goto('/status')
    expect(response?.status()).toBe(200)
    // Regardless of live RPC health, 5 rows must always render
    const rows = page.getByTestId('chain-health-list').locator('li')
    await expect(rows).toHaveCount(5)
    // No uncaught console errors at the page level
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    // Re-navigate to capture any console errors
    await page.goto('/status')
    await page.waitForLoadState('networkidle')
    // Filter out known benign browser warnings (e.g. favicon 404)
    const fatalErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('404'))
    expect(fatalErrors).toHaveLength(0)
  })
})

test.describe('DASH-08 — GET /api/status JSON route', () => {
  test('returns 200 with version:1 envelope + chains[5] + apps.abrigo', async ({ request }) => {
    const res = await request.get('/api/status')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.version).toBe(1)
    expect(typeof body.status).toBe('string')
    expect(typeof body.build).toBe('string')
    expect(typeof body.timestamp).toBe('string')
    expect(Array.isArray(body.chains)).toBe(true)
    expect(body.chains).toHaveLength(5)
    expect(body.apps?.abrigo).toBeDefined()
    // No serialization errors
    expect(() => JSON.stringify(body)).not.toThrow()
  })

  test('/api/status: each chain entry has chainId, name, and a valid status', async ({
    request,
  }) => {
    const res = await request.get('/api/status')
    const body = await res.json()
    const validStatuses = new Set(['healthy', 'degraded'])
    for (const chain of body.chains) {
      expect(typeof chain.chainId).toBe('number')
      expect(typeof chain.name).toBe('string')
      expect(validStatuses.has(chain.status)).toBe(true)
    }
  })

  test('/api/status: no HuggingFace or dataset-version field in the response', async ({
    request,
  }) => {
    const res = await request.get('/api/status')
    const body = await res.json()
    const bodyStr = JSON.stringify(body).toLowerCase()
    expect(bodyStr).not.toContain('huggingface')
    expect(bodyStr).not.toContain('dataset_version')
    expect(bodyStr).not.toContain('parquet')
  })
})
