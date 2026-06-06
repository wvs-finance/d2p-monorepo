/**
 * position-panel.test.tsx — TDD RED stubs for PositionPanel
 * Phase 07-02: not-deployed empty state under the neutral fork-verified tier.
 *
 * Honesty greps (MAJOR-13): all DOM assertions use textContent (not source grep).
 * No status-pass/green/emerald. No stale-baseline identifiers. No dollar sign in DOM.
 * No <details>. No em-dash in displayed numeric copy.
 */
import { PositionPanel, type PositionPanelStrings } from '@/components/defi/somnia/PositionPanel'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal strings fixture (mirrors the UI-SPEC copy keys)
// ---------------------------------------------------------------------------
const strings: PositionPanelStrings = {
  heading: 'Position (LongGammaWrapper)',
  emptyHeading: 'No on-chain position',
  emptyBody:
    'The contract is fork-verified but not deployed. Once deployed, this view will show the real position.',
  notLiveCaption: 'Not deployed — fork-verified, no on-chain position.',
  provenanceLabel: 'fork-verified · not deployed',
  provenanceAriaLabel:
    'Source: fork-verified — the LongGammaWrapper contract is not deployed on-chain; no real position exists.',
  fieldLegs: 'Position legs',
  fieldCollateral: 'Surviving collateral',
  fieldTokenId: 'Position token id',
  fieldResidual: 'Residual',
  emptyState: '—',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PositionPanel (not-deployed empty state)', () => {
  it('renders with data-testid position-panel', () => {
    render(<PositionPanel strings={strings} />)
    expect(screen.getByTestId('position-panel')).toBeDefined()
  })

  it('renders the fork-verified provenance pill with correct label and aria-label', () => {
    render(<PositionPanel strings={strings} />)
    // ProvenancePill renders a <span aria-label={ariaLabel}> containing the label text
    const pill = screen.getByText(strings.provenanceLabel)
    expect(pill).toBeDefined()
    // aria-label is on the pill root span
    const pillRoot = screen.getByLabelText(strings.provenanceAriaLabel)
    expect(pillRoot).toBeDefined()
  })

  it('renders the panel heading', () => {
    render(<PositionPanel strings={strings} />)
    expect(screen.getByText(strings.heading)).toBeDefined()
  })

  it('renders the not-live caption directly under the heading', () => {
    render(<PositionPanel strings={strings} />)
    expect(screen.getByText(strings.notLiveCaption)).toBeDefined()
  })

  it('renders the empty-state heading', () => {
    render(<PositionPanel strings={strings} />)
    expect(screen.getByText(strings.emptyHeading)).toBeDefined()
  })

  it('renders the empty-state body text', () => {
    render(<PositionPanel strings={strings} />)
    expect(screen.getByText(strings.emptyBody)).toBeDefined()
  })

  it('renders all four dl field labels', () => {
    render(<PositionPanel strings={strings} />)
    expect(screen.getByText(strings.fieldLegs)).toBeDefined()
    expect(screen.getByText(strings.fieldCollateral)).toBeDefined()
    expect(screen.getByText(strings.fieldTokenId)).toBeDefined()
    expect(screen.getByText(strings.fieldResidual)).toBeDefined()
  })

  it('every dd is the em-dash (no fabricated value)', () => {
    render(<PositionPanel strings={strings} />)
    const dds = screen.getAllByRole('definition')
    expect(dds.length).toBeGreaterThanOrEqual(4)
    for (const dd of dds) {
      expect(dd.textContent).toBe('—')
    }
  })

  it('rendered DOM contains no dollar sign (MAJOR-13: textContent assertion, not source grep)', () => {
    const { container } = render(<PositionPanel strings={strings} />)
    expect(container.textContent).not.toContain('$')
  })

  it('rendered DOM contains no status-pass/green/emerald className', () => {
    const { container } = render(<PositionPanel strings={strings} />)
    // Check the entire outerHTML so classNames are included
    expect(container.innerHTML).not.toMatch(/status-pass|green|emerald/)
  })

  it('rendered text contains no stale-baseline code identifiers', () => {
    const { container } = render(<PositionPanel strings={strings} />)
    const text = container.textContent ?? ''
    expect(text).not.toContain('lastSurviving')
    expect(text).not.toContain('deposited')
    expect(text).not.toContain('realizedCosts')
  })

  it('no <details> element rendered (MAJOR-10)', () => {
    const { container } = render(<PositionPanel strings={strings} />)
    expect(container.querySelector('details')).toBeNull()
  })
})
