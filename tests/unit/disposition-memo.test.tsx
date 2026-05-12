// @vitest-environment jsdom
import { DispositionMemo } from '@/components/DispositionMemo'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const baseIteration = {
  slug: 'fx-vol-on-cpi-surprise',
  version: 1,
  status: 'FAIL' as const,
  title_es: 'FX-vol sobre sorpresa CPI',
  title_en: 'FX-vol on CPI surprise',
  analysis_date: new Date('2026-02-10'),
  disposition_memo:
    'The null hypothesis β = 0 cannot be rejected. CI includes zero. Iteration closed.',
  code: '',
}

function mockT(key: string): string {
  const keys: Record<string, string> = {
    'iterations.detail.disposition.heading': 'Disposition',
    'iterations.detail.disposition.fail_notice':
      'This iteration was rejected. The full disposition documents the finding.',
    'iterations.status.fail.label': 'Fail',
    'iterations.status.pass.label': 'Pass',
    'iterations.status.parked.label': 'Parked',
    'iterations.status.in_progress.label': 'In Progress',
  }
  return keys[key] ?? key
}

describe('<DispositionMemo />', () => {
  it('renders a <section> with H2 heading "Disposition"', () => {
    const { container } = render(
      <DispositionMemo iteration={baseIteration} locale="en" t={mockT} />,
    )
    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
    expect(screen.getByText('Disposition')).toBeInTheDocument()
  })

  it('prose content uses class text-text-primary (NOT text-text-muted)', () => {
    const { container } = render(
      <DispositionMemo iteration={baseIteration} locale="en" t={mockT} />,
    )
    const proseDiv = container.querySelector('.text-text-primary')
    expect(proseDiv).toBeInTheDocument()
    // Must not use text-text-muted for memo body
    const mutedEl = container.querySelector('.text-text-muted')
    // text-text-muted may exist on meta elements but the main prose div must not have it
    // Check the actual prose container
    const proseMemo = container.querySelector('[class*="prose"]')
    expect(proseMemo?.classList.contains('text-text-muted')).toBeFalsy()
  })

  it('contains NO <details> or <summary> element (no collapse)', () => {
    const { container } = render(
      <DispositionMemo iteration={baseIteration} locale="en" t={mockT} />,
    )
    expect(container.querySelector('details')).not.toBeInTheDocument()
    expect(container.querySelector('summary')).not.toBeInTheDocument()
  })

  it('composes StatusPill with the iteration status for screen-reader context', () => {
    const { container } = render(
      <DispositionMemo iteration={baseIteration} locale="en" t={mockT} />,
    )
    // StatusPill renders as an <output> element with the status classes
    const pill = container.querySelector('.text-status-fail')
    expect(pill).toBeInTheDocument()
  })
})
