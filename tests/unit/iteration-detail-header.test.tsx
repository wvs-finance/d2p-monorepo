// @vitest-environment jsdom
import { IterationDetailHeader } from '@/components/IterationDetailHeader'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const baseIteration = {
  slug: 'pair-d',
  version: 1,
  status: 'PASS' as const,
  title_es: 'Par D — estimación OLS',
  title_en: 'Pair D — OLS estimate',
  analysis_date: new Date('2026-01-15'),
  code: '',
}

function mockT(key: string): string {
  const keys: Record<string, string> = {
    'iterations.detail.version_label': 'version',
    'iterations.status.pass.label': 'Pass',
    'iterations.status.fail.label': 'Fail',
    'iterations.status.parked.label': 'Parked',
    'iterations.status.in_progress.label': 'In Progress',
  }
  return keys[key] ?? key
}

describe('<IterationDetailHeader />', () => {
  it('renders StatusPill + version + H1 + analysis date', () => {
    const { container } = render(
      <IterationDetailHeader iteration={baseIteration} locale="en" t={mockT} />,
    )
    // StatusPill is present
    expect(container.querySelector('.text-status-pass')).toBeInTheDocument()
    // Version label
    expect(screen.getByText(/v1/)).toBeInTheDocument()
    // H1 title
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
    expect(h1?.textContent).toContain('Pair D')
    // Date (time element)
    expect(container.querySelector('time')).toBeInTheDocument()
  })

  it('H1 has the iteration title text and class containing text-3xl or text-4xl', () => {
    const { container } = render(
      <IterationDetailHeader iteration={baseIteration} locale="en" t={mockT} />,
    )
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
    const classes = h1?.className ?? ''
    expect(classes.includes('text-3xl') || classes.includes('text-4xl')).toBe(true)
  })

  it('layout uses flex-col sm:flex-row for mobile stacking', () => {
    const { container } = render(
      <IterationDetailHeader iteration={baseIteration} locale="en" t={mockT} />,
    )
    const flexContainer = container.querySelector('.flex-col.sm\\:flex-row')
    expect(flexContainer).toBeInTheDocument()
  })
})
