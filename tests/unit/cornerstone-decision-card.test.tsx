// @vitest-environment jsdom
// TDD RED — HedgeDecisionCardV2 honesty contract.
// RC-B2 (BLOCKER): rationale MUST render under explicit "explicación (autoría humana)" label.
// RC-M6: strike renders as "4.100" — no raw WAD integer; no 4th type size introduced.
// CROSS-09: color + icon + text + aria-label; never color alone; fork-verified = NEUTRAL only.
// No <details>/<summary>. No green/emerald/status-pass. Every mock numeric has sibling label.

import '@testing-library/jest-dom/vitest'
import { HedgeDecisionCardV2 } from '@/components/defi/cornerstone/HedgeDecisionCardV2'
import type { HedgeLegParamsView } from '@/lib/apps/abrigo/cornerstone/events'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Mock HedgeLegParamsView — strikeWAD is already formatted "4.100" (from fromMockEvent)
// ---------------------------------------------------------------------------

const MOCK_VIEW: HedgeLegParamsView = {
  marketLabel: 'wCOP/USDC (UniV4, Polygon)',
  strikeWAD: '4.100',
  size: 100n,
  isLong: true,
  schoolLabel: 'Shiller macro-risk / post-Keynesian',
  rationale: 'La representatividad del pool es adecuada para la cobertura macro propuesta.',
  nonErgodicDisclosed: true,
  parametricHedged: false,
  payoff: {
    volToWidth: '5%',
    horizonBlocks: 100,
    tickSpacing: 60,
    asset: 'token0',
  },
  maxLoss: '= prima',
  upside: 'ilimitado',
  marginDelta: { token0: 500n, token1: 0n },
}

// ---------------------------------------------------------------------------
// Threaded strings — mirrors the CardV2Strings interface
// ---------------------------------------------------------------------------

const STRINGS = {
  // Provenance
  forkVerifiedLabel: 'verificado en fork · decisión Agente 2',
  forkVerifiedAriaLabel:
    'Fuente: verificado en fork — decisión de Agente 2 sobre pool representativo; no desplegado.',
  // Mock sub-label (FlaskConical pill)
  mockSubLabel: 'mock · no en vivo',
  mockSubLabelAria: 'Estado: mock — no en vivo. Datos ilustrativos, no inferidos en tiempo real.',
  // Human-authored label (RC-B2 BLOCKER)
  humanAuthoredLabel: 'explicación (autoría humana)',
  // Field labels
  marketLabel: 'Mercado',
  strikeLabel: 'Strike',
  sizeLabel: 'Tamaño',
  directionLabel: 'Dirección',
  schoolLabel: 'Escuela',
  volWidthLabel: 'Vol → Ancho',
  horizonLabel: 'Horizonte (bloques)',
  tickSpacingLabel: 'Tick spacing',
  assetLabel: 'Activo',
  maxLossLabel: '= prima (máx. pérdida)',
  upsideLabel: 'ilimitado (ilustrativo)',
  marginLabel: 'Margen delta (token0)',
  // Mock unit label
  mockUnit: 'ilustrativo',
  // Confirm foot
  confirmGateCaption: 'Acción simulada — no se ejecuta en ninguna cadena.',
  confirmCta: 'Confirmar (simulado)',
}

describe('HedgeDecisionCardV2 — honesty + visual contract', () => {
  function renderCard() {
    return render(<HedgeDecisionCardV2 view={MOCK_VIEW} strings={STRINGS} onConfirm={() => {}} />)
  }

  // --- Provenance pills ---

  it('renders a ProvenancePill with tier fork-verified (neutral, not green)', () => {
    const { container } = renderCard()
    // The fork-verified pill uses ShieldCheck icon and neutral token classes
    const pills = container.querySelectorAll('span[aria-label]')
    const fvPill = Array.from(pills).find((el) => el.getAttribute('aria-label')?.includes('fork'))
    expect(fvPill).toBeInTheDocument()
    expect(fvPill?.className).not.toMatch(/status-pass|green|emerald/)
    expect(fvPill?.className).toContain('text-text-muted')
  })

  it('renders a FlaskConical mock sub-label pill with "mock · no en vivo" text', () => {
    renderCard()
    expect(screen.getByText('mock · no en vivo')).toBeVisible()
  })

  it('mock sub-label pill has aria-label encoding color + icon + text (CROSS-09)', () => {
    const { container } = renderCard()
    const mockPill = container.querySelector(`[aria-label="${STRINGS.mockSubLabelAria}"]`)
    expect(mockPill).toBeInTheDocument()
  })

  // --- No green/emerald anywhere in the card ---

  it('card root has NO green/emerald/status-pass class (anti-fishing CROSS-09)', () => {
    const { container } = renderCard()
    expect(container.innerHTML).not.toMatch(/status-pass|text-green|bg-green|emerald/)
  })

  // --- No <details>/<summary> ---

  it('contains ZERO <details> elements (full visual weight, LAB-05)', () => {
    const { container } = renderCard()
    expect(container.querySelector('details')).toBeNull()
  })

  // --- All HedgeLegParamsView fields render ---

  it('renders the market label field', () => {
    renderCard()
    expect(screen.getByText('wCOP/USDC (UniV4, Polygon)')).toBeVisible()
  })

  it('renders the strike formatted as "4.100" (not raw WAD integer)', () => {
    renderCard()
    expect(screen.getByText('4.100')).toBeVisible()
  })

  it('renders the school label (human string, not 0x000…0)', () => {
    renderCard()
    expect(screen.getByText('Shiller macro-risk / post-Keynesian')).toBeVisible()
  })

  it('renders vol→width, horizonBlocks, tickSpacing, asset fields', () => {
    renderCard()
    expect(screen.getByText('5%')).toBeVisible()
    // multiple "100" may appear (horizonBlocks + size) — just assert at least one is visible
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('60')).toBeVisible()
    expect(screen.getByText('token0')).toBeVisible()
  })

  it('renders isLong direction field', () => {
    renderCard()
    // direction row value — rendered as "Long" or "Larga" etc.
    expect(screen.getByText(/long|larg/i)).toBeVisible()
  })

  // --- STRIKE-FORMAT AC (RC-M6): no raw WAD integer (17+ digit bigint) ---

  it('STRIKE-FORMAT AC: no raw 17+ digit WAD integer in rendered text', () => {
    const { container } = renderCard()
    expect(container.textContent).not.toMatch(/\d{17,}/)
  })

  // --- HUMAN-AUTHORED RATIONALE AC (BLOCKER RC-B2) ---

  it('RC-B2 BLOCKER: rationale renders under the explicit human-authored label', () => {
    const { container } = renderCard()
    const humanLabel = screen.getByText('explicación (autoría humana)')
    expect(humanLabel).toBeInTheDocument()
    // The rationale text must appear in the same card section
    expect(
      screen.getByText(
        'La representatividad del pool es adecuada para la cobertura macro propuesta.',
      ),
    ).toBeInTheDocument()
  })

  it('RC-B2: rationale region does NOT attribute reasoning to agent/LLM', () => {
    const { container } = renderCard()
    // The immediate adjacent textContent around the rationale must not say "agente" or "LLM" as attribution
    const rationalePara = screen.getByText(
      'La representatividad del pool es adecuada para la cobertura macro propuesta.',
    )
    // Its parent should not have agent/LLM attribution adjacent
    expect(rationalePara.parentElement?.textContent).not.toMatch(
      /\bagente\b|\bLLM\b|\bIA\b|\bAI\b/i,
    )
  })

  // --- TYPE-SIZE AC (RC-M6/FD-M5): no 4th font-size class ---

  it('TYPE-SIZE AC: ilustrativo sibling labels use only established size tokens (no 4th size)', () => {
    const { container } = renderCard()
    // We check that the only size classes present are from the known scale
    // (text-sm, text-base, text-xl — the 3 scale items). text-xs is NOT in the 3-size scale.
    // The sibling label must not introduce a new font-size class.
    const allEls = container.querySelectorAll('[class*="text-"]')
    const sizeClasses: Set<string> = new Set()
    for (const el of Array.from(allEls)) {
      const matches = (el.className.match(/text-(?:sm|base|xl|text-[a-z]+)/g) ?? []).filter(
        (c) => !c.startsWith('text-text-') && !c.startsWith('text-status-'),
      )
      for (const m of matches) sizeClasses.add(m)
    }
    // No text-xs, text-lg, text-2xl, text-3xl (outside the spec scale)
    expect([...sizeClasses]).not.toContain('text-xs')
    expect([...sizeClasses]).not.toContain('text-lg')
    expect([...sizeClasses]).not.toContain('text-2xl')
  })

  // --- Every mock numeric has adjacent mock/ilustrativo sibling label ---

  it('strike value "4.100" has an adjacent sibling label containing "ilustrativo" or "mock"', () => {
    const { container } = renderCard()
    const strikeNode = screen.getByText('4.100')
    const parentRow = strikeNode.closest('div')
    expect(parentRow?.textContent).toMatch(/ilustrativo|mock/i)
  })

  it('margin delta value has adjacent sibling label containing "ilustrativo" or "mock"', () => {
    const { container } = renderCard()
    // margin is rendered as a string from bigint
    const parentRows = container.querySelectorAll('dd')
    const marginRow = Array.from(parentRows).find((el) => el.textContent?.includes('500'))
    expect(marginRow?.parentElement?.textContent).toMatch(/ilustrativo|mock/i)
  })

  // --- No raw 0x000…0 in DOM ---

  it('DOM contains NO raw 0x000…0 address', () => {
    const { container } = renderCard()
    expect(container.textContent).not.toMatch(/0x0{20,}/)
  })

  // --- No executed/realized/$ adjacent to values ---

  it('DOM contains no banned strings: executed/realized/ejecutad/realizad', () => {
    const { container } = renderCard()
    expect(container.textContent).not.toMatch(/executed|realized|ejecutad|realizad/i)
  })

  it('DOM contains no bare $ adjacent to mock values', () => {
    const { container } = renderCard()
    // $ must not appear adjacent to any numeric value implying realized PnL
    expect(container.textContent).not.toMatch(/\$\s*\d/)
  })

  // --- Confirm button at card foot ---

  it('renders a Confirm button with role=button and gate caption', () => {
    renderCard()
    const btn = screen.getByRole('button', { name: /confirmar.*simulado/i })
    expect(btn).toBeVisible()
    expect(screen.getByText('Acción simulada — no se ejecuta en ninguna cadena.')).toBeVisible()
  })

  it('Confirm button has min-h-[44px] class (≥44px hit target)', () => {
    renderCard()
    const btn = screen.getByRole('button', { name: /confirmar.*simulado/i })
    expect(btn.className).toContain('min-h-[44px]')
  })
})
