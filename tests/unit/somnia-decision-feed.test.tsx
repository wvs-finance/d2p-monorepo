// @vitest-environment jsdom
// Wave 0 RED stub — 06-02 flips this GREEN (HedgeDecisionFeed lands).
// Module @/components/defi/somnia/HedgeDecisionFeed does NOT exist yet.
// Import is indirected so tsc --noEmit passes pre-commit while the module is absent.
// This file is excluded from tsconfig.json until 06-02 creates the module.
// CROSS-09 / anti-fishing: equal visual weight; "consensus = operator-supplied"; no green pill.

import '@testing-library/jest-dom/vitest'
import { describe, expect, test } from 'vitest'

const FEED_MODULE = '@/components/defi/somnia/HedgeDecisionFeed'

describe.skip('HedgeDecisionFeed — 06-02 (deferred RED)', () => {
  test('renders 2 non-pending decision cards at equal visual weight', async () => {
    // Un-skipped and implemented in Plan 06-02.
    // Expected behavior:
    //   - Renders getHedgeDecisions() → 2 cards
    //   - Both cards have the same className/visual weight (anti-fishing)
    //   - Card 0: ADD_LONG_GAMMA / 6800 bps
    //   - Card 1: REDUCE / 568 bps
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<Record<string, never>>
    }
    expect(HedgeDecisionFeed).toBeDefined()
  })

  test('consensus label says "operator-supplied" (not market consensus)', async () => {
    // Un-skipped and implemented in Plan 06-02.
    // Expected: the word "operator-supplied" (or "suministrado por operador") appears
    //   alongside the consensus value — never "market consensus" or "verified consensus"
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<Record<string, never>>
    }
    expect(HedgeDecisionFeed).toBeDefined()
  })

  test('surprise (macroValue - consensus) is gated behind the operator-supplied caveat', async () => {
    // Un-skipped and implemented in Plan 06-02.
    // Expected: surprise value is shown only with an explicit caveat label
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<Record<string, never>>
    }
    expect(HedgeDecisionFeed).toBeDefined()
  })
})
