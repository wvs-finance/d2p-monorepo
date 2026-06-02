// @vitest-environment jsdom
// Wave 0 RED stub — CROSS-09/DEFI-08: ProvenancePill + SimuladoBadge render assertions.
// Imports from @/components/defi/ProvenanceBadge which does NOT exist yet (Wave 2 creates it).
// CROSS-09 anti-fishing: pills always encode color + icon + text, never color alone.
// Three tiers: "fork-fixture" | "spec" | "schematic"
// SimuladoBadge: shows "SIMULADO" text + svg icon node.
import '@testing-library/jest-dom/vitest'
import { ProvenancePill, SimuladoBadge } from '@/components/defi/ProvenanceBadge'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const TIER_LABELS = {
  'fork-fixture': 'fork-fixture',
  spec: 'spec',
  schematic: 'schematic',
} as const

describe('ProvenancePill — three tiers render color + icon + text', () => {
  it('tier="fork-fixture" renders visible tier label text', () => {
    render(
      <ProvenancePill
        tier="fork-fixture"
        fieldName="pool"
        ariaLabel="Fuente: fork-fixture — datos del contrato desplegado en el fork"
      />,
    )
    expect(screen.getByText(TIER_LABELS['fork-fixture'])).toBeVisible()
  })

  it('tier="fork-fixture" renders an svg icon node', () => {
    const { container } = render(
      <ProvenancePill
        tier="fork-fixture"
        fieldName="pool"
        ariaLabel="Fuente: fork-fixture — datos del contrato desplegado en el fork"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('tier="fork-fixture" has aria-label carrying the full provenance sentence', () => {
    render(
      <ProvenancePill
        tier="fork-fixture"
        fieldName="pool"
        ariaLabel="Fuente: fork-fixture — datos del contrato desplegado en el fork"
      />,
    )
    const el = screen.getByLabelText(
      'Fuente: fork-fixture — datos del contrato desplegado en el fork',
    )
    expect(el).toBeInTheDocument()
  })

  it('tier="spec" renders visible tier label text', () => {
    render(
      <ProvenancePill
        tier="spec"
        fieldName="cashflow"
        ariaLabel="Fuente: spec — parámetro especificado"
      />,
    )
    expect(screen.getByText(TIER_LABELS.spec)).toBeVisible()
  })

  it('tier="spec" renders an svg icon node', () => {
    const { container } = render(
      <ProvenancePill
        tier="spec"
        fieldName="cashflow"
        ariaLabel="Fuente: spec — parámetro especificado"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('tier="schematic" renders visible tier label text', () => {
    render(
      <ProvenancePill
        tier="schematic"
        fieldName="payoff"
        ariaLabel="Fuente: schematic — diagrama conceptual"
      />,
    )
    expect(screen.getByText(TIER_LABELS.schematic)).toBeVisible()
  })

  it('tier="schematic" renders an svg icon node', () => {
    const { container } = render(
      <ProvenancePill
        tier="schematic"
        fieldName="payoff"
        ariaLabel="Fuente: schematic — diagrama conceptual"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('SimuladoBadge — renders SIMULADO text + icon', () => {
  it('shows "SIMULADO" text', () => {
    render(<SimuladoBadge ariaLabel="Instrumento simulado — no ha sido desplegado en cadena" />)
    expect(screen.getByText('SIMULADO')).toBeInTheDocument()
  })

  it('renders an svg icon node', () => {
    const { container } = render(
      <SimuladoBadge ariaLabel="Instrumento simulado — no ha sido desplegado en cadena" />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an aria-label', () => {
    render(<SimuladoBadge ariaLabel="Instrumento simulado — no ha sido desplegado en cadena" />)
    const el = screen.getByLabelText('Instrumento simulado — no ha sido desplegado en cadena')
    expect(el).toBeInTheDocument()
  })
})
