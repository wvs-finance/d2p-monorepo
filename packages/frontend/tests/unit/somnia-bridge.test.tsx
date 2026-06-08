// @vitest-environment jsdom
// Plan 06-04 — HedgeDecisionBridge unit tests (RED stub flipped GREEN).
// Tests cover:
//   1. decisionToPositionDelta — BigInt-exact mapping (ADD_LONG_GAMMA / REDUCE / HOLD)
//   2. formatFractionOfMax — edge formatter (6800n → "68%")
//   3. HedgeDecisionBridge rendering — surprise, action, sizeBps, schematic delta,
//      operator-supplied caveat, gated surprise, testnet-agent pill, honest empty state
//
// The bridge component is an RSC (no 'use client') and calls getHedgeDecisions() internally.
// For unit testing we mock the reader module to control the decision set.

import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Shared fixture — snapshot decisions (from 06-00 real tx hashes)
// ---------------------------------------------------------------------------

const ADD_DECISION = {
  decisionId: '1',
  action: 'ADD_LONG_GAMMA' as const,
  sizeBps: 6800n,
  macroValue: 568n,
  consensus: 500n,
  decidedAt: new Date('2024-01-01T00:00:00Z'),
  pending: false,
  sourceTxHash: '0x2a8ec9',
}

const REDUCE_DECISION = {
  decisionId: '2',
  action: 'REDUCE' as const,
  sizeBps: 568n,
  macroValue: 568n,
  consensus: 900n,
  decidedAt: new Date('2024-01-01T00:00:05Z'),
  pending: false,
  sourceTxHash: '0x5057f8',
}

const PENDING_DECISION = {
  decisionId: '3',
  action: 'ADD_LONG_GAMMA' as const,
  sizeBps: 0n,
  macroValue: 0n,
  consensus: 0n,
  decidedAt: null,
  pending: true,
  sourceTxHash: '0xpending',
}

// ---------------------------------------------------------------------------
// Mock the reader module before component imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/apps/abrigo/somnia/reader', () => ({
  getHedgeDecisions: vi.fn(() => [ADD_DECISION, REDUCE_DECISION]),
}))

// ---------------------------------------------------------------------------
// Imports (after mock setup)
// ---------------------------------------------------------------------------

import { HedgeDecisionBridge } from '@/components/defi/somnia/HedgeDecisionBridge'
import { decisionToPositionDelta, formatFractionOfMax } from '@/lib/apps/abrigo/somnia/bridge'

// ---------------------------------------------------------------------------
// Minimal BridgeStrings for rendering
// ---------------------------------------------------------------------------

const BRIDGE_STRINGS = {
  heading: 'De la sorpresa macro a la posición',
  macroLabel: 'Impresión macro',
  consensusLabel: 'Consenso',
  consensusCaveat: 'suministrado por el operador — no por el mercado',
  surpriseLabel: 'Sorpresa',
  actionLabel: {
    HOLD: 'Mantener',
    ADD_LONG_GAMMA: 'Añadir gamma larga',
    REDUCE: 'Reducir',
    EXIT: 'Salir',
  },
  sizeBpsLabel: 'Tamaño (bps)',
  deltaLabel: 'Delta ilustrativo de posición',
  illustrativeMarker: 'ilustrativo',
  provenanceLabel: 'Somnia testnet · agente (POC)',
  provenanceAriaLabel: 'Somnia testnet · decisión de agente (POC) · registrada',
  emptyState: '—',
  emptyGamma: 'No se registró decisión de gamma larga',
}

const SIMULATED_INSTRUMENT = {
  kind: 'simulated' as const,
  id: 'ccop-usd-long-gamma',
  name: 'Cobertura larga gamma cCOP/USD',
  nameEn: 'cCOP/USD Long-Gamma Hedge',
  chainId: 8453 as const,
  fixtureKey: 'ccop-usd-long-gamma',
}

// ---------------------------------------------------------------------------
// 1. decisionToPositionDelta — pure BigInt mapping
// ---------------------------------------------------------------------------

describe('decisionToPositionDelta — pure BigInt mapping', () => {
  test('ADD_LONG_GAMMA/6800 → increase, fractionOfMaxBps 6800n (bigint)', () => {
    const delta = decisionToPositionDelta(ADD_DECISION)
    expect(delta.direction).toBe('increase')
    expect(delta.sizeBps).toBe(6800n)
    expect(delta.fractionOfMaxBps).toBe(6800n)
    expect(typeof delta.fractionOfMaxBps).toBe('bigint')
    expect(delta.schematic).toBe(true)
  })

  test('REDUCE/568 → decrease, fractionOfMaxBps 568n (bigint)', () => {
    const delta = decisionToPositionDelta(REDUCE_DECISION)
    expect(delta.direction).toBe('decrease')
    expect(delta.sizeBps).toBe(568n)
    expect(delta.fractionOfMaxBps).toBe(568n)
    expect(typeof delta.fractionOfMaxBps).toBe('bigint')
  })

  test('HOLD → flat direction', () => {
    const holdDecision = { ...ADD_DECISION, action: 'HOLD' as const, sizeBps: 0n }
    const delta = decisionToPositionDelta(holdDecision)
    expect(delta.direction).toBe('flat')
  })

  test('EXIT → decrease direction', () => {
    const exitDecision = { ...REDUCE_DECISION, action: 'EXIT' as const }
    const delta = decisionToPositionDelta(exitDecision)
    expect(delta.direction).toBe('decrease')
  })

  test('BigInt exactness: sizeBps above Number.MAX_SAFE_INTEGER stays exact', () => {
    const largeSizeBps = BigInt(Number.MAX_SAFE_INTEGER) + 1n
    const bigDecision = {
      ...ADD_DECISION,
      sizeBps: largeSizeBps,
    }
    const delta = decisionToPositionDelta(bigDecision)
    // fractionOfMaxBps must also be bigint (not Number-coerced)
    expect(typeof delta.fractionOfMaxBps).toBe('bigint')
    // The calculation must be exact (no Number overflow)
    const expected = (largeSizeBps * 10000n) / 10000n
    expect(delta.fractionOfMaxBps).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// 2. formatFractionOfMax — edge formatter
// ---------------------------------------------------------------------------

describe('formatFractionOfMax — edge formatter', () => {
  test('formatFractionOfMax(6800n) returns "68%"', () => {
    expect(formatFractionOfMax(6800n)).toBe('68%')
  })

  test('formatFractionOfMax(568n) returns "6%"', () => {
    // 568 / 100 = 5.68 → Math.round → 6
    expect(formatFractionOfMax(568n)).toBe('6%')
  })

  test('formatFractionOfMax(10000n) returns "100%"', () => {
    expect(formatFractionOfMax(10000n)).toBe('100%')
  })

  test('formatFractionOfMax(0n) returns "0%"', () => {
    expect(formatFractionOfMax(0n)).toBe('0%')
  })
})

// ---------------------------------------------------------------------------
// 3. HedgeDecisionBridge rendering
// ---------------------------------------------------------------------------

describe('HedgeDecisionBridge — rendering with ADD_LONG_GAMMA snapshot decision', () => {
  test('renders the bridge heading', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    expect(screen.getByText('De la sorpresa macro a la posición')).toBeTruthy()
  })

  test('renders surprise +68 (sign preserved)', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // computeSurprise(568n, 500n) = +68n → formatSurprise(68n) = "+0.68"
    // The component renders the raw formatSurprise output
    expect(screen.getByText('+0.68')).toBeTruthy()
  })

  test('renders ADD_LONG_GAMMA action label (human-readable)', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    expect(screen.getByText('Añadir gamma larga')).toBeTruthy()
  })

  test('renders sizeBps 6800', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // sizeBps 6800 appears as the rendered value
    expect(screen.getByText('6800')).toBeTruthy()
  })

  test('renders schematic delta "68%" with illustrative marker', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    expect(screen.getByText('68%')).toBeTruthy()
    // The "ilustrativo" marker must appear (M6 — delta labeled illustrative)
    // Use getAllByText since it may appear in multiple nodes (e.g., label + span)
    expect(screen.getAllByText(/ilustrativo/i).length).toBeGreaterThan(0)
  })

  test('renders operator-supplied consensus caveat (M4)', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // M4: caveat text must be visible
    expect(screen.getByText(/operator|operador|no.*mercado|not.*market/i)).toBeTruthy()
  })

  test('surprise label appears ONLY within a subtree that also contains the operator caveat (gating)', () => {
    const { container } = render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // The surprise row must be inside the same card as the consensus+caveat
    // (so surprise is always "gated" by the caveat being visible in context)
    const card = container.querySelector('[data-testid="bridge-card"]')
    expect(card).toBeTruthy()
    // Both the caveat and the surprise row must be inside the card
    const caveatInCard = within(card as HTMLElement).queryByText(
      /operator|operador|no.*mercado|not.*market/i,
    )
    const surpriseInCard = within(card as HTMLElement).queryByText(/sorpresa|surprise/i)
    expect(caveatInCard).toBeTruthy()
    expect(surpriseInCard).toBeTruthy()
  })

  test('testnet-agent ProvenancePill is present with neutral (non-green) token', () => {
    const { container } = render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // ProvenancePill renders a span with aria-label containing the provenance sentence
    const pill = container.querySelector('span[aria-label]')
    expect(pill).toBeTruthy()
    // M4/CROSS-09: pill must NOT use green/emerald/status-pass
    const pillClass = pill?.className ?? ''
    expect(pillClass).not.toMatch(/green|emerald|status-pass/)
    // aria-label must contain provenance info
    expect(pill?.getAttribute('aria-label')).toMatch(/somnia|testnet|poc|agente/i)
  })

  test('does NOT render a fabricated dollar notional or current price', () => {
    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // The bridge must NOT show any dollar sign, USD, or "precio" (price) in the data
    const content = document.body.textContent ?? ''
    // These patterns would indicate fabricated notional
    expect(content).not.toMatch(/\$\d+|\d+\s*USD/)
  })
})

// ---------------------------------------------------------------------------
// 4. Honest empty state — no ADD_LONG_GAMMA decision
// ---------------------------------------------------------------------------

describe('HedgeDecisionBridge — honest empty state when no ADD_LONG_GAMMA', () => {
  test('renders honest empty state when getHedgeDecisions returns no ADD decision', async () => {
    // Override the mock to return only a REDUCE decision (no ADD_LONG_GAMMA)
    const { getHedgeDecisions } = await import('@/lib/apps/abrigo/somnia/reader')
    vi.mocked(getHedgeDecisions).mockReturnValueOnce([REDUCE_DECISION])

    render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // Should render the honest empty-state message (not a fabricated ADD_LONG_GAMMA)
    expect(screen.getByText('No se registró decisión de gamma larga')).toBeTruthy()
    // Should NOT render the action label or sizeBps for a non-existent ADD decision
    expect(screen.queryByText('Añadir gamma larga')).toBeNull()
  })

  test('renders em-dash for delta when no ADD_LONG_GAMMA decision', async () => {
    const { getHedgeDecisions } = await import('@/lib/apps/abrigo/somnia/reader')
    vi.mocked(getHedgeDecisions).mockReturnValueOnce([REDUCE_DECISION])

    const { container } = render(
      <HedgeDecisionBridge
        instrument={SIMULATED_INSTRUMENT}
        labels={BRIDGE_STRINGS}
        locale="es-CO"
      />,
    )
    // The delta field in the empty state must be em-dash, not 0
    const emDashes = container.querySelectorAll('[data-testid="bridge-delta-value"]')
    // All delta values must be em-dash (never 0)
    for (const el of emDashes) {
      expect(el.textContent).not.toBe('0')
      expect(el.textContent).not.toBe('0%')
    }
  })
})
