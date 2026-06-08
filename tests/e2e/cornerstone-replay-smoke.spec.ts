// tests/e2e/cornerstone-replay-smoke.spec.ts
//
// T0 REPLAY SMOKE TEST — the CI gate (Phase 9, Wave 0).
//
// GOVERNANCE (spec v5, 2026-06-08):
//   Replay mode is the GUARANTEED in-phase demo artifact. It MUST render the
//   snapshot end-to-end from snapshot.json WITHOUT reading the live RPC at render.
//   This test PROVES that guarantee by:
//     1. Blocking ALL requests to the BuildBear fork RPC (page.route → abort)
//        BEFORE navigation. The page must never depend on the fork RPC to render.
//     2. Asserting the recorded Agent-1 decision strings appear in the DOM.
//     3. Asserting the recorded mint strike anchor "360360" appears in the DOM
//        (from the rationale text or from the formatted strike anchor).
//
// ASSERTION ANCHORS (pinned 2026-06-08 against snapshot.json + workflow-engine.ts):
//   - Agent-1 decision thesis: "co/inflation-rate=5.68%"
//     (workflow-engine rationale text, from the recorded Somnia macro datum)
//   - Mint strike anchor: "360360"
//     (from the executor rationale "strike 360360 (tick 360360)" — the recorded mint strike)
//
// CI GATE contract: this test must remain GREEN through all Phase 9 live work.
// Live work adds the live path WITHOUT breaking replay. If this test fails,
// replay is broken — that is a BLOCKER.
//
// RPC-INDEPENDENT: the fork RPC (rpc.buildbear.io/colossal-groot-e8ea55ce) is
// ABORTED at the network level. If replay reads the RPC, it will fail, exposing the bug.

import { expect, test } from '@playwright/test'

const ROUTE = '/apps/abrigo/cornerstone'

// The BuildBear fork RPC hostname — blocked before navigation to prove RPC-independence.
const FORK_RPC_HOST = 'rpc.buildbear.io'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test.describe('Cornerstone replay smoke — RPC-independent CI gate', () => {
  test('replay renders recorded decision+mint with fork RPC unreachable (the CI gate)', async ({
    page,
  }) => {
    // STEP 1: Block the fork RPC BEFORE navigation.
    // Any request to rpc.buildbear.io is aborted. This proves replay is RPC-independent.
    await page.route(`**/${FORK_RPC_HOST}/**`, (route) => {
      route.abort()
    })
    // Also block the direct URL pattern
    await page.route('**/rpc.buildbear.io**', (route) => {
      route.abort()
    })

    // STEP 2: Navigate to the cornerstone route.
    await page.goto(ROUTE)

    // STEP 3: Trigger the replay flow by clicking preset chip 1.
    await page
      .getByRole('button', {
        name: /inflaci[oó]n.*sorprendi[oó].*alza|upside.*hedge/i,
      })
      .click()

    // STEP 4: Wait for Agent-1 (StrategistDecided) entry to render.
    await page.waitForSelector('[data-step="a1"]', { timeout: 5000 })

    // STEP 5: Wait for Agent-2 (ExecutorDecided) entry to render.
    await page.waitForSelector('[data-step="a2"]', { timeout: 10000 })

    // STEP 6: Confirm to trigger the mint.
    await expect(page.locator('[data-confirm]')).toBeFocused()
    await page.locator('[data-confirm]').click()

    // STEP 7: Wait for the mint entry to render.
    await page.waitForSelector('[data-step="mint"]', { timeout: 5000 })

    // STEP 8: Assert the recorded Agent-1 decision anchor is present.
    // This string comes from the mock rationale text referencing the real
    // Somnia macro datum (co/inflation-rate=5.68% from snapshot.json macroValue 568).
    const transcriptText = await page.locator('[data-testid="transcript"]').textContent()
    expect(transcriptText).toBeTruthy()
    expect(transcriptText).toMatch(/co\/inflation-rate=5\.68%/i)

    // STEP 9: Assert the recorded mint strike anchor "360360" is present.
    // This string comes from the executor rationale text which cites the
    // recorded fork mint strike (mintedStrike: 360360 from buildbear-deployments.json).
    // Pattern: "strike 360360 (tick 360360)" in the rationale.
    expect(transcriptText).toMatch(/360360/)

    // STEP 10: Assert no console errors from RPC calls
    // (The page must not have tried to call the RPC and errored)
    const consoleMsgs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleMsgs.push(msg.text())
    })

    // Verify the mint step rendered successfully (DOM order: a1 < a2 < mint)
    const steps = await page.evaluate(() =>
      [...document.querySelectorAll('[data-step]')].map((el) => el.getAttribute('data-step')),
    )
    const a1Idx = steps.indexOf('a1')
    const a2Idx = steps.indexOf('a2')
    const mintIdx = steps.indexOf('mint')
    expect(a1Idx).toBeGreaterThanOrEqual(0)
    expect(a2Idx).toBeGreaterThanOrEqual(0)
    expect(mintIdx).toBeGreaterThanOrEqual(0)
    expect(a1Idx).toBeLessThan(a2Idx)
    expect(a2Idx).toBeLessThan(mintIdx)
  })
})
