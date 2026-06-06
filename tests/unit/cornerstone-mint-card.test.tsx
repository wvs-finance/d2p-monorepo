// @vitest-environment jsdom
// TDD RED — MintCard honesty contract.
// CROSS-09: color + icon + text + aria-label; fork-verified = NEUTRAL only.
// No <details>/<summary>. No green. Every mock numeric has sibling label.
// No raw 0x000…0. No executed/realized.

import '@testing-library/jest-dom/vitest'
import { MintCard } from '@/components/defi/cornerstone/MintCard'
import type { PositionMintedView } from '@/lib/apps/abrigo/cornerstone/events'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Mock PositionMintedView
// ---------------------------------------------------------------------------

const MOCK_MINT: PositionMintedView = {
  kind: 'PositionMinted',
  positionId: '4083729',
  marginToken0: 500n,
  marginToken1: -200n,
}

// ---------------------------------------------------------------------------
// Threaded strings
// ---------------------------------------------------------------------------

const STRINGS = {
  forkVerifiedLabel: 'verificado en fork · acuñación (mock)',
  forkVerifiedAriaLabel:
    'Fuente: verificado en fork — acuñación simulada; no desplegado en cadena.',
  mockSubLabel: 'mock · no en vivo',
  mockSubLabelAria: 'Estado: mock — no en vivo. Datos ilustrativos, no inferidos en tiempo real.',
  tokenIdLabel: 'ID del token de posición',
  marginToken0Label: 'Margen delta (token0)',
  marginToken1Label: 'Margen delta (token1)',
  mockUnit: 'ilustrativo',
  // Optional leg fields forwarded from the decision card
  marketLabel: 'Mercado',
  strikeLabel: 'Strike',
  isLongLabel: 'Dirección',
  // Card heading
  cardHeading: 'Acuñación (mock)',
}

describe('MintCard — honesty + visual contract', () => {
  function renderCard() {
    return render(<MintCard mint={MOCK_MINT} strings={STRINGS} />)
  }

  // --- Provenance pills ---

  it('renders a ProvenancePill with tier fork-verified (neutral)', () => {
    const { container } = renderCard()
    const pill = container.querySelector('span[aria-label*="fork"]')
    expect(pill).toBeInTheDocument()
    expect(pill?.className).not.toMatch(/status-pass|green|emerald/)
  })

  it('renders a FlaskConical mock sub-label pill with "mock · no en vivo" text', () => {
    renderCard()
    expect(screen.getByText('mock · no en vivo')).toBeVisible()
  })

  it('mock sub-label pill has correct aria-label (CROSS-09)', () => {
    const { container } = renderCard()
    const mockPill = container.querySelector(`[aria-label="${STRINGS.mockSubLabelAria}"]`)
    expect(mockPill).toBeInTheDocument()
  })

  // --- No green ---

  it('card root has NO green/emerald/status-pass class', () => {
    const { container } = renderCard()
    expect(container.innerHTML).not.toMatch(/status-pass|text-green|bg-green|emerald/)
  })

  // --- No <details> ---

  it('contains ZERO <details> elements (full visual weight)', () => {
    const { container } = renderCard()
    expect(container.querySelector('details')).toBeNull()
  })

  // --- Required fields render ---

  it('renders the TokenId field', () => {
    renderCard()
    expect(screen.getByText('4083729')).toBeVisible()
  })

  it('renders marginToken0 value', () => {
    renderCard()
    expect(screen.getByText('500')).toBeVisible()
  })

  it('renders marginToken1 value (negative bigint, sign preserved)', () => {
    renderCard()
    expect(screen.getByText('-200')).toBeVisible()
  })

  // --- Every mock numeric has adjacent mock/ilustrativo sibling label ---

  it('TokenId has adjacent sibling label containing "ilustrativo" or "mock"', () => {
    const { container } = renderCard()
    const tokenIdNode = screen.getByText('4083729')
    const parentRow = tokenIdNode.closest('div')
    expect(parentRow?.textContent).toMatch(/ilustrativo|mock/i)
  })

  it('marginToken0 value has adjacent sibling label containing "ilustrativo" or "mock"', () => {
    const { container } = renderCard()
    const node = screen.getByText('500')
    const parentRow = node.closest('div')
    expect(parentRow?.textContent).toMatch(/ilustrativo|mock/i)
  })

  // --- No raw 0x000…0 ---

  it('DOM contains NO raw 0x000…0 address', () => {
    const { container } = renderCard()
    expect(container.textContent).not.toMatch(/0x0{20,}/)
  })

  // --- No banned strings ---

  it('DOM contains no banned strings: executed/realized/ejecutad/realizad', () => {
    const { container } = renderCard()
    expect(container.textContent).not.toMatch(/executed|realized|ejecutad|realizad/i)
  })

  it('DOM contains no bare $ adjacent to mock values', () => {
    const { container } = renderCard()
    expect(container.textContent).not.toMatch(/\$\s*\d/)
  })
})
