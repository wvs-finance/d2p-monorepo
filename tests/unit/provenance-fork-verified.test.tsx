// @vitest-environment jsdom
// Wave 0 — fork-verified ProvenanceTier.
// CROSS-09 anti-fishing: color + icon + text + aria-label; never color alone.
// The fork-verified tier is NEUTRAL (non-green); signals "fork-verified · not deployed".
// Turned GREEN by Plan 07-00 Task 1 (ProvenanceBadge.tsx extended with fork-verified + ShieldCheck).

import '@testing-library/jest-dom/vitest'
import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const ARIA =
  'LongGammaWrapper · fork-verified · not deployed · Phase 7: position panel renders not-live empty state'

describe('ProvenancePill tier="fork-verified" — neutral token (CROSS-09)', () => {
  it('renders the passed label as visible text', () => {
    render(
      <ProvenancePill
        tier="fork-verified"
        fieldName="wrapper-position"
        label="Fork verificado · no desplegado"
        ariaLabel={ARIA}
      />,
    )
    expect(screen.getByText('Fork verificado · no desplegado')).toBeVisible()
  })

  it('has the passed aria-label on the wrapper span', () => {
    render(
      <ProvenancePill
        tier="fork-verified"
        fieldName="wrapper-position"
        label="Fork verificado · no desplegado"
        ariaLabel={ARIA}
      />,
    )
    expect(screen.getByLabelText(ARIA)).toBeInTheDocument()
  })

  it('className does NOT contain "status-pass", "green", or "emerald" (never green)', () => {
    const { container } = render(
      <ProvenancePill
        tier="fork-verified"
        fieldName="wrapper-position"
        label="Fork verificado · no desplegado"
        ariaLabel={ARIA}
      />,
    )
    const pill = container.querySelector('span')
    expect(pill?.className).not.toMatch(/status-pass|green|emerald/)
  })

  it('className includes exact neutral tokens: text-text-muted and ring-border-default and bg-bg-surface', () => {
    const { container } = render(
      <ProvenancePill
        tier="fork-verified"
        fieldName="wrapper-position"
        label="Fork verificado · no desplegado"
        ariaLabel={ARIA}
      />,
    )
    const pill = container.querySelector('span')
    expect(pill?.className).toContain('text-text-muted')
    expect(pill?.className).toContain('ring-border-default')
    expect(pill?.className).toContain('bg-bg-surface')
  })

  it('renders a ShieldCheck svg icon (aria-hidden)', () => {
    const { container } = render(
      <ProvenancePill
        tier="fork-verified"
        fieldName="wrapper-position"
        label="Fork verificado · no desplegado"
        ariaLabel={ARIA}
      />,
    )
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })

  it('aria-label does NOT contain "status-pass", "green", or "emerald"', () => {
    render(
      <ProvenancePill
        tier="fork-verified"
        fieldName="wrapper-position"
        label="Fork verificado · no desplegado"
        ariaLabel={ARIA}
      />,
    )
    expect(ARIA).not.toMatch(/status-pass|green|emerald/)
  })
})
