// @vitest-environment jsdom
import { IterationCatalogCard } from '@/components/IterationCatalogCard'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const baseIteration = {
  slug: 'pair-d',
  version: 1,
  status: 'PASS' as const,
  title_es: 'Par D estimacion OLS',
  title_en: 'Pair D OLS estimate',
  beta: 0.137,
  analysis_date: new Date('2026-01-15'),
  code: '',
}

const baseLabels = {
  statusLabels: {
    PASS: 'Pass',
    FAIL: 'Fail',
    PARKED: 'Parked',
    IN_PROGRESS: 'In Progress',
  } as const,
}

describe('<IterationCatalogCard />', () => {
  it('renders min-h-[120px] class on outer element', () => {
    const { container } = render(
      <IterationCatalogCard iteration={baseIteration} locale="en" labels={baseLabels} />,
    )
    const anchor = container.querySelector('a')
    expect(anchor?.className).toContain('min-h-[120px]')
  })

  it('card is a single anchor linking to the iteration detail URL', () => {
    const { container } = render(
      <IterationCatalogCard iteration={baseIteration} locale="en" labels={baseLabels} />,
    )
    const anchor = container.querySelector('a')
    expect(anchor).toBeInTheDocument()
    expect(anchor?.getAttribute('href')).toBe('/apps/abrigo/iterations/pair-d/v1')
  })

  it('contains StatusPill with the iteration status', () => {
    const { container } = render(
      <IterationCatalogCard iteration={baseIteration} locale="en" labels={baseLabels} />,
    )
    expect(container.querySelector('.text-status-pass')).toBeInTheDocument()
  })

  it('contains H3 with title', () => {
    render(<IterationCatalogCard iteration={baseIteration} locale="en" labels={baseLabels} />)
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.textContent).toContain('Pair D OLS estimate')
  })

  it('renders β value in font-mono when present; omits entirely when absent', () => {
    const { container: withBeta } = render(
      <IterationCatalogCard iteration={baseIteration} locale="en" labels={baseLabels} />,
    )
    const betaEl = withBeta.querySelector('.font-mono')
    expect(betaEl?.textContent).toContain('0.1370')

    // Without beta — should NOT render any placeholder
    const { beta: _b, ...iterWithoutBeta } = baseIteration
    const { container: noBeta } = render(
      <IterationCatalogCard iteration={iterWithoutBeta} locale="en" labels={baseLabels} />,
    )
    const allText = noBeta.textContent ?? ''
    expect(allText).not.toContain('—')
    expect(allText).not.toContain('N/A')
  })

  it('equal card height for PASS and FAIL statuses via identical min-h-[120px] class', () => {
    const failIteration = { ...baseIteration, status: 'FAIL' as const }
    const { container: passContainer } = render(
      <IterationCatalogCard iteration={baseIteration} locale="en" labels={baseLabels} />,
    )
    const { container: failContainer } = render(
      <IterationCatalogCard iteration={failIteration} locale="en" labels={baseLabels} />,
    )
    const passAnchor = passContainer.querySelector('a')
    const failAnchor = failContainer.querySelector('a')
    expect(passAnchor?.className).toContain('min-h-[120px]')
    expect(failAnchor?.className).toContain('min-h-[120px]')
    // Same class strings
    expect(passAnchor?.className).toBe(failAnchor?.className)
  })
})
