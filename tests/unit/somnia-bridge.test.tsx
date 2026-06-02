// @vitest-environment jsdom
// Wave 0 RED stub — 06-04 flips this GREEN (HedgeDecisionBridge lands).
// Module @/components/defi/somnia/HedgeDecisionBridge does NOT exist yet.
// Import is indirected so tsc --noEmit passes pre-commit while the module is absent.
// This file is excluded from tsconfig.json until 06-04 creates the module.
// Bridge mounts on the simulated cCOP/USD instrument page (kind==='simulated' branch).

import '@testing-library/jest-dom/vitest'
import { describe, expect, test } from 'vitest'

const BRIDGE_MODULE = '@/components/defi/somnia/HedgeDecisionBridge'

describe.skip('HedgeDecisionBridge — 06-04 (deferred RED)', () => {
  test('renders on the simulated-branch instrument page', async () => {
    // Un-skipped and implemented in Plan 06-04.
    // Expected: Bridge component renders when kind==="simulated" is passed
    //   (the exact mount branch for the cCOP/USD long-gamma instrument)
    const { HedgeDecisionBridge } = (await import(BRIDGE_MODULE)) as {
      HedgeDecisionBridge: React.ComponentType<{ instrumentId: string }>
    }
    expect(HedgeDecisionBridge).toBeDefined()
  })

  test('computes and displays surprise from module-1 instrument data', async () => {
    // Un-skipped and implemented in Plan 06-04.
    // Expected: Bridge connects surprise = macroValue - consensus from reader.ts
    //   to the instrument's consensus field from module-1 fixture
    const { HedgeDecisionBridge } = (await import(BRIDGE_MODULE)) as {
      HedgeDecisionBridge: React.ComponentType<{ instrumentId: string }>
    }
    expect(HedgeDecisionBridge).toBeDefined()
  })

  test('does NOT render on the live-branch instrument page', async () => {
    // Un-skipped and implemented in Plan 06-04.
    // Expected: Bridge returns null when kind==="live" (no Somnia data for live instruments)
    const { HedgeDecisionBridge } = (await import(BRIDGE_MODULE)) as {
      HedgeDecisionBridge: React.ComponentType<{ instrumentId: string; kind?: string }>
    }
    expect(HedgeDecisionBridge).toBeDefined()
  })
})
