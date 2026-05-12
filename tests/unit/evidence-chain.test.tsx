// @vitest-environment jsdom
import { EvidenceChain } from '@/components/EvidenceChain'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const baseIteration = {
  slug: 'pair-d',
  version: 1,
  status: 'PASS' as const,
  title_es: 'Par D',
  title_en: 'Pair D',
  beta: 0.137,
  ci_lower: 0.092,
  ci_upper: 0.182,
  p_value: 0.000000015,
  sample_size: 847,
  replication_hash: 'abcdef1234567890',
  analysis_date: new Date('2026-01-15'),
  code: '',
}

function mockT(key: string): string {
  const keys: Record<string, string> = {
    'iterations.detail.evidence.heading': 'Evidence chain',
    'iterations.detail.evidence.beta_label': 'β',
    'iterations.detail.evidence.ci_label': '95% CI',
    'iterations.detail.evidence.pvalue_label': 'p-value',
    'iterations.detail.evidence.sample_size_label': 'N =',
    'iterations.detail.evidence.replication_label': 'Replication hash',
    'iterations.detail.replication.copy.copy_button_aria': 'Copy replication hash',
    'iterations.detail.replication.copied_toast': 'Copied!',
  }
  return keys[key] ?? key
}

describe('<EvidenceChain />', () => {
  it('renders <dl> with <dt>/<dd> pairs for each present field', () => {
    const { container } = render(<EvidenceChain iteration={baseIteration} t={mockT} />)
    expect(container.querySelector('dl')).toBeInTheDocument()
    const dts = container.querySelectorAll('dt')
    expect(dts.length).toBeGreaterThanOrEqual(5)
    const dds = container.querySelectorAll('dd')
    expect(dds.length).toBeGreaterThanOrEqual(5)
  })

  it('omits rows entirely when field is null/undefined', () => {
    // exactOptionalPropertyTypes: explicitly undefined is not assignable to optional;
    // omit the keys entirely to satisfy the type contract.
    const {
      beta: _b,
      ci_lower: _cl,
      ci_upper: _cu,
      p_value: _pv,
      sample_size: _ss,
      replication_hash: _rh,
      ...coreFields
    } = baseIteration
    const iterationWithoutOptionals: Parameters<typeof EvidenceChain>[0]['iteration'] = coreFields
    const { container } = render(<EvidenceChain iteration={iterationWithoutOptionals} t={mockT} />)
    const dts = container.querySelectorAll('dt')
    // No rows should be present since all optional fields omitted
    expect(dts.length).toBe(0)
    // No placeholder dashes
    expect(container.textContent).not.toContain('—')
    expect(container.textContent).not.toContain('N/A')
  })

  it('BetaCIChart is composed inside the β row when beta + ci_lower + ci_upper are all present', () => {
    const { container } = render(<EvidenceChain iteration={baseIteration} t={mockT} />)
    // BetaCIChart renders an SVG
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('heading element has id="evidence-heading" and section uses aria-labelledby', () => {
    const { container } = render(<EvidenceChain iteration={baseIteration} t={mockT} />)
    const heading = container.querySelector('#evidence-heading')
    expect(heading).toBeInTheDocument()
    const section = container.querySelector('section[aria-labelledby="evidence-heading"]')
    expect(section).toBeInTheDocument()
  })
})
