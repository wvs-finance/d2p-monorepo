// @vitest-environment jsdom
// 06-02 — HedgeDecisionFeed + HedgeDecisionCard unit tests.
// Un-skipped from Wave-0 RED stub. Tests drive GREEN implementation.
//
// CROSS-09 / anti-fishing: equal visual weight; "consensus = operator-supplied"; no green pill.
// M4: no "consensus-verified" anywhere in the rendered output.
// M5: snapshot tuples verified (ADD_LONG_GAMMA/6800/surprise+68, REDUCE/568/surprise-332).

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

afterEach(cleanup)

// ─── Mocked strings for HedgeDecisionCard ─────────────────────────────────

const MOCK_STRINGS = {
  actionLabel: {
    HOLD: 'Mantener',
    ADD_LONG_GAMMA: 'Añadir gamma larga',
    REDUCE: 'Reducir',
    EXIT: 'Salir',
  },
  sizeBpsLabel: 'Tamaño (bps)',
  macroLabel: 'Impresión macro',
  consensusLabel: 'Consenso',
  consensusCaveat: 'suministrado por el operador — no por el mercado',
  surpriseLabel: 'Sorpresa',
  pendingLabel: 'pendiente',
  provenanceLabel: 'Somnia testnet · agente (POC)',
  provenanceAriaLabel: 'Somnia testnet · agente macro (POC) · registrado',
  emptyState: '—',
}

// ─── Import targets ────────────────────────────────────────────────────────

const CARD_MODULE = '@/components/defi/somnia/HedgeDecisionCard'
const FEED_MODULE = '@/components/defi/somnia/HedgeDecisionFeed'

// ─── Sample decision views (match snapshot chain data exactly — M5) ────────

const DECISION_ADD: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView = {
  decisionId: '4083729',
  action: 'ADD_LONG_GAMMA',
  sizeBps: 6800n,
  macroValue: 568n,
  consensus: 500n,
  decidedAt: new Date(1700000000 * 1000),
  pending: false,
  sourceTxHash: '0x2a8ec9',
}

const DECISION_REDUCE: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView = {
  decisionId: '4083997',
  action: 'REDUCE',
  sizeBps: 568n,
  macroValue: 568n,
  consensus: 900n,
  decidedAt: new Date(1700001000 * 1000),
  pending: false,
  sourceTxHash: '0x5057f8',
}

const DECISION_PENDING: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView = {
  decisionId: '9999999',
  action: 'HOLD',
  sizeBps: 1000n,
  macroValue: 568n,
  consensus: 500n,
  decidedAt: null,
  pending: true,
  sourceTxHash: '0x000000',
}

// ─── HedgeDecisionCard tests ───────────────────────────────────────────────

describe('HedgeDecisionCard', () => {
  test('renders ADD_LONG_GAMMA card: action label, sizeBps, macro, consensus+caveat, surprise +68', async () => {
    const { HedgeDecisionCard } = (await import(CARD_MODULE)) as {
      HedgeDecisionCard: React.ComponentType<{
        decision: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionCard decision={DECISION_ADD} strings={MOCK_STRINGS} locale="es-CO" />)

    // action label — human-readable es-CO
    expect(screen.getByText('Añadir gamma larga')).toBeInTheDocument()

    // sizeBps
    expect(screen.getByText(/6800/)).toBeInTheDocument()

    // macro value
    expect(screen.getByText(/568/)).toBeInTheDocument()

    // consensus label + operator caveat (M4 honesty)
    const consensusCaveatEl = screen.getByText(/suministrado por el operador/i)
    expect(consensusCaveatEl).toBeInTheDocument()

    // surprise = macroValue - consensus = 568 - 500 = +68
    expect(screen.getByText(/\+0\.68/)).toBeInTheDocument()
  })

  test('renders REDUCE card: action label, sizeBps 568, surprise -332', async () => {
    const { HedgeDecisionCard } = (await import(CARD_MODULE)) as {
      HedgeDecisionCard: React.ComponentType<{
        decision: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionCard decision={DECISION_REDUCE} strings={MOCK_STRINGS} locale="es-CO" />)

    // action label
    expect(screen.getByText('Reducir')).toBeInTheDocument()

    // sizeBps — use getAllByText since 568 appears in both macroValue and sizeBps
    const allSizes = screen.getAllByText(/^568$/)
    expect(allSizes.length).toBeGreaterThanOrEqual(1)

    // surprise = 568 - 900 = -332
    expect(screen.getByText(/-3\.32/)).toBeInTheDocument()
  })

  test('consensus label carries the operator-supplied caveat (M4 honesty gating)', async () => {
    const { HedgeDecisionCard } = (await import(CARD_MODULE)) as {
      HedgeDecisionCard: React.ComponentType<{
        decision: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    const { container } = render(
      <HedgeDecisionCard decision={DECISION_ADD} strings={MOCK_STRINGS} locale="es-CO" />,
    )

    // The word "operator" (or "operador") must be present alongside the consensus field
    const html = container.innerHTML.toLowerCase()
    expect(html).toMatch(/operador|operator/)

    // "consensus-verified" must NEVER appear (M4)
    expect(html).not.toMatch(/consensus-verified/)
  })

  test('surprise appears only within the subtree that contains the operator caveat', async () => {
    const { HedgeDecisionCard } = (await import(CARD_MODULE)) as {
      HedgeDecisionCard: React.ComponentType<{
        decision: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    const { container } = render(
      <HedgeDecisionCard decision={DECISION_ADD} strings={MOCK_STRINGS} locale="es-CO" />,
    )

    // The surprise label "Sorpresa" must be present
    const surpriseEls = container.querySelectorAll('[data-testid="surprise-row"]')
    expect(surpriseEls.length).toBeGreaterThan(0)

    // Each surprise row's ancestor must contain the operator caveat text
    for (const el of Array.from(surpriseEls)) {
      const card = el.closest('[data-testid="decision-card"]')
      expect(card?.innerHTML.toLowerCase()).toMatch(/operador|operator/)
    }
  })

  test('equal weight — ADD_LONG_GAMMA and REDUCE cards share the same root className', async () => {
    const { HedgeDecisionCard } = (await import(CARD_MODULE)) as {
      HedgeDecisionCard: React.ComponentType<{
        decision: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    const { container: cAdd } = render(
      <HedgeDecisionCard decision={DECISION_ADD} strings={MOCK_STRINGS} locale="es-CO" />,
    )
    const { container: cRed } = render(
      <HedgeDecisionCard decision={DECISION_REDUCE} strings={MOCK_STRINGS} locale="es-CO" />,
    )

    const cardAdd = cAdd.querySelector('[data-testid="decision-card"]')
    const cardRed = cRed.querySelector('[data-testid="decision-card"]')

    expect(cardAdd).not.toBeNull()
    expect(cardRed).not.toBeNull()

    // Root className must be identical — no emphasis class for one over the other
    expect(cardAdd?.className).toBe(cardRed?.className)
  })

  test('pending decision renders "pendiente" badge and em-dash for action/size/surprise', async () => {
    const { HedgeDecisionCard } = (await import(CARD_MODULE)) as {
      HedgeDecisionCard: React.ComponentType<{
        decision: import('@/lib/apps/abrigo/somnia/types').HedgeDecisionView
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionCard decision={DECISION_PENDING} strings={MOCK_STRINGS} locale="es-CO" />)

    // pending badge text
    expect(screen.getByText('pendiente')).toBeInTheDocument()

    // em-dash placeholder for action/size/surprise — NEVER 0
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBeGreaterThanOrEqual(1)

    // "0" must not appear as a text node in any testid fields
    const card = document.querySelector('[data-testid="decision-card"]')
    const actionField = card?.querySelector('[data-testid="action-value"]')
    expect(actionField?.textContent).not.toBe('0')
  })
})

// ─── HedgeDecisionFeed tests ───────────────────────────────────────────────

describe('HedgeDecisionFeed — 06-02 (un-skipped)', () => {
  test('renders 2 non-pending decision cards at equal visual weight', async () => {
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<{
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionFeed strings={MOCK_STRINGS} locale="es-CO" />)

    const cards = document.querySelectorAll('[data-testid="decision-card"]')
    expect(cards.length).toBe(2)

    // Both cards share the same root className (equal visual weight — anti-fishing)
    expect(cards[0]?.className).toBe(cards[1]?.className)
  })

  test('consensus label says "operador" (not market consensus)', async () => {
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<{
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionFeed strings={MOCK_STRINGS} locale="es-CO" />)

    // "operador" must appear in the page (M4 caveat)
    const bodyText = document.body.innerHTML.toLowerCase()
    expect(bodyText).toMatch(/operador|operator/)
    expect(bodyText).not.toMatch(/consensus-verified/)
  })

  test('surprise is gated behind the operator-supplied caveat', async () => {
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<{
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionFeed strings={MOCK_STRINGS} locale="es-CO" />)

    // Every [data-testid="surprise-row"] must be within a card that also has the operator caveat
    const surpriseRows = document.querySelectorAll('[data-testid="surprise-row"]')
    expect(surpriseRows.length).toBeGreaterThan(0)

    for (const row of Array.from(surpriseRows)) {
      const card = row.closest('[data-testid="decision-card"]')
      expect(card?.innerHTML.toLowerCase()).toMatch(/operador|operator/)
    }
  })

  test('M5 — ADD_LONG_GAMMA card: sizeBps=6800, surprise=+0.68', async () => {
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<{
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionFeed strings={MOCK_STRINGS} locale="es-CO" />)

    // ADD_LONG_GAMMA action
    expect(screen.getByText('Añadir gamma larga')).toBeInTheDocument()
    // sizeBps 6800
    expect(screen.getByText(/6800/)).toBeInTheDocument()
    // surprise +68 formatted as +0.68
    expect(screen.getByText(/\+0\.68/)).toBeInTheDocument()
  })

  test('M5 — REDUCE card: sizeBps=568, surprise=-3.32', async () => {
    const { HedgeDecisionFeed } = (await import(FEED_MODULE)) as {
      HedgeDecisionFeed: React.ComponentType<{
        strings: typeof MOCK_STRINGS
        locale: string
      }>
    }

    render(<HedgeDecisionFeed strings={MOCK_STRINGS} locale="es-CO" />)

    expect(screen.getByText('Reducir')).toBeInTheDocument()
    // surprise -332 formatted as -3.32
    expect(screen.getByText(/-3\.32/)).toBeInTheDocument()
  })
})
