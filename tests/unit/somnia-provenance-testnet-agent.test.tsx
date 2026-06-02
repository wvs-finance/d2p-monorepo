// @vitest-environment jsdom
// Wave 0 — somnia-provenance: testnet-agent ProvenanceTier.
// CROSS-09 anti-fishing: color + icon + text + aria-label; never color alone.
// The testnet-agent tier is NEUTRAL (non-green); live/recorded sub-state swaps icon not color.
// Turned GREEN by Plan 06-00 Task 2 (ProvenanceBadge.tsx extended with testnet-agent).
// Excluded from tsconfig until Task 2 extends ProvenanceTier; removed from exclude in that commit.

import '@testing-library/jest-dom/vitest'
import { ProvenancePill } from '@/components/defi/ProvenanceBadge'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const ARIA = 'Somnia testnet · agent decision (POC) · consensus = operator-supplied · recorded'
const ARIA_LIVE = 'Somnia testnet · agent decision (POC) · consensus = operator-supplied · live'

describe('ProvenancePill tier="testnet-agent" — neutral token (CROSS-09)', () => {
  it('renders the passed label as visible text', () => {
    render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
      />,
    )
    expect(screen.getByText('Agente testnet')).toBeVisible()
  })

  it('has the passed aria-label on the wrapper span', () => {
    render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
      />,
    )
    expect(screen.getByLabelText(ARIA)).toBeInTheDocument()
  })

  it('className does NOT contain "status-pass", "green", or "emerald" (never green)', () => {
    const { container } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
      />,
    )
    const pill = container.querySelector('span')
    expect(pill?.className).not.toMatch(/status-pass|green|emerald/)
  })

  it('className includes the neutral token (text-text-muted or ring-border-default)', () => {
    const { container } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
      />,
    )
    const pill = container.querySelector('span')
    expect(pill?.className).toMatch(/text-text-muted|ring-border-default/)
  })

  it('renders an svg icon node with aria-hidden', () => {
    const { container } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
      />,
    )
    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })

  it('aria-label contains "agent decision (POC)" — not "consensus-verified"', () => {
    render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
      />,
    )
    const el = screen.getByLabelText(ARIA)
    expect(ARIA).toContain('agent decision (POC)')
    expect(ARIA).not.toContain('consensus-verified')
    expect(el).toBeInTheDocument()
  })
})

describe('ProvenancePill testnet-agent — subState live/recorded icon swap (not color swap)', () => {
  it('subState="recorded" renders an svg icon', () => {
    const { container } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
        subState="recorded"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('subState="live" renders an svg icon', () => {
    const { container } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA_LIVE}
        subState="live"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('subState live and recorded produce different icon elements but same color className', () => {
    const { container: c1 } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA}
        subState="recorded"
      />,
    )
    const { container: c2 } = render(
      <ProvenancePill
        tier="testnet-agent"
        fieldName="hedge-decision"
        label="Agente testnet"
        ariaLabel={ARIA_LIVE}
        subState="live"
      />,
    )
    // Both use the neutral className — color does NOT change
    const pill1 = c1.querySelector('span')
    const pill2 = c2.querySelector('span')
    expect(pill1?.className).toMatch(/text-text-muted|ring-border-default/)
    expect(pill2?.className).toMatch(/text-text-muted|ring-border-default/)
    // The icons differ (different lucide components produce different path data)
    const svg1 = c1.querySelector('svg')?.innerHTML
    const svg2 = c2.querySelector('svg')?.innerHTML
    expect(svg1).not.toBe(svg2)
  })
})
