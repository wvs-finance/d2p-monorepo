// @vitest-environment jsdom
// CROSS-09/DEFI-08: ProvenancePill + SimuladoBadge render assertions.
// CROSS-09 anti-fishing: pills always encode color + icon + text, never color alone.
// Three tiers: "fork-fixture" | "spec" | "schematic".
// es-CO-first (CROSS-10): the VISIBLE text is the locale-aware `label` prop,
//   NOT the raw English tier key. These tests assert the localized label is shown
//   and the raw tier key is NOT (regression guard for the label-vs-tier bug).
import '@testing-library/jest-dom/vitest'
import { ProvenancePill, SimuladoBadge } from '@/components/defi/ProvenanceBadge'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// Locale-aware labels (es-CO), as authored in messages/es-CO/instruments.json provenance.*
const TIER_LABELS = {
  'fork-fixture': 'Fork fixture',
  spec: 'Especificación',
  schematic: 'Esquemático',
} as const

describe('ProvenancePill — three tiers render color + icon + localized text', () => {
  it('tier="fork-fixture" renders the localized label, not the raw key', () => {
    render(
      <ProvenancePill
        tier="fork-fixture"
        fieldName="pool"
        label={TIER_LABELS['fork-fixture']}
        ariaLabel="Fuente: fork-fixture — datos del contrato desplegado en el fork"
      />,
    )
    expect(screen.getByText('Fork fixture')).toBeVisible()
    // Regression guard: the raw tier key must NOT be the visible text.
    expect(screen.queryByText('fork-fixture')).not.toBeInTheDocument()
  })

  it('tier="fork-fixture" renders an svg icon node', () => {
    const { container } = render(
      <ProvenancePill
        tier="fork-fixture"
        fieldName="pool"
        label={TIER_LABELS['fork-fixture']}
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
        label={TIER_LABELS['fork-fixture']}
        ariaLabel="Fuente: fork-fixture — datos del contrato desplegado en el fork"
      />,
    )
    const el = screen.getByLabelText(
      'Fuente: fork-fixture — datos del contrato desplegado en el fork',
    )
    expect(el).toBeInTheDocument()
  })

  it('tier="spec" renders the localized label "Especificación", not "spec"', () => {
    render(
      <ProvenancePill
        tier="spec"
        fieldName="cashflow"
        label={TIER_LABELS.spec}
        ariaLabel="Fuente: spec — parámetro especificado"
      />,
    )
    expect(screen.getByText('Especificación')).toBeVisible()
    expect(screen.queryByText('spec')).not.toBeInTheDocument()
  })

  it('tier="spec" renders an svg icon node', () => {
    const { container } = render(
      <ProvenancePill
        tier="spec"
        fieldName="cashflow"
        label={TIER_LABELS.spec}
        ariaLabel="Fuente: spec — parámetro especificado"
      />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('tier="schematic" renders the localized label "Esquemático", not "schematic"', () => {
    render(
      <ProvenancePill
        tier="schematic"
        fieldName="payoff"
        label={TIER_LABELS.schematic}
        ariaLabel="Fuente: schematic — diagrama conceptual"
      />,
    )
    expect(screen.getByText('Esquemático')).toBeVisible()
    expect(screen.queryByText('schematic')).not.toBeInTheDocument()
  })

  it('tier="schematic" renders an svg icon node', () => {
    const { container } = render(
      <ProvenancePill
        tier="schematic"
        fieldName="payoff"
        label={TIER_LABELS.schematic}
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
