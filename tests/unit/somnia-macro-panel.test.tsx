// @vitest-environment jsdom
// Wave 0 RED stub — 06-01 flips this GREEN (MacroDataPanel lands).
// Module @/components/defi/somnia/MacroDataPanel does NOT exist yet.
// Import is indirected so tsc --noEmit passes pre-commit while the module is absent.
// This file is excluded from tsconfig.json until 06-01 creates the module.
// CROSS-09: provenance pill + neutral token; no green color on testnet-agent tier.

import '@testing-library/jest-dom/vitest'
import { describe, expect, test } from 'vitest'

const MACRO_PANEL_MODULE = '@/components/defi/somnia/MacroDataPanel'

describe.skip('MacroDataPanel — 06-01 (deferred RED)', () => {
  test('renders the latest CPI scaledValue as formatted percentage', async () => {
    // Un-skipped and implemented in Plan 06-01.
    // Expected behavior:
    //   - Renders the scaledValue 568 as "5.68%" (scale=2 decimal shift)
    //   - Uses getLatestMacroPrint() from reader.ts
    //   - Mounts a ProvenancePill tier="testnet-agent" with subState="recorded"
    const { MacroDataPanel } = (await import(MACRO_PANEL_MODULE)) as {
      MacroDataPanel: React.ComponentType<{ dataKey?: string }>
    }
    expect(MacroDataPanel).toBeDefined()
  })

  test('renders the MacroReceived history list', async () => {
    // Un-skipped and implemented in Plan 06-01.
    // Expected behavior:
    //   - Renders getMacroHistory() items
    //   - Each item shows scaledValue formatted + capturedAt date
    const { MacroDataPanel } = (await import(MACRO_PANEL_MODULE)) as {
      MacroDataPanel: React.ComponentType<{ dataKey?: string }>
    }
    expect(MacroDataPanel).toBeDefined()
  })

  test('provenance pill is neutral (not green)', async () => {
    // Un-skipped and implemented in Plan 06-01.
    // Expected: className does not contain status-pass/green/emerald
    const { MacroDataPanel } = (await import(MACRO_PANEL_MODULE)) as {
      MacroDataPanel: React.ComponentType<{ dataKey?: string }>
    }
    expect(MacroDataPanel).toBeDefined()
  })
})
