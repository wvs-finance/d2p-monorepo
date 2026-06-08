// @vitest-environment jsdom
import { PublicationCard } from '@/components/PublicationCard'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const baseResearch = {
  slug: 'pair-d-dispatch-brief',
  title_es: 'Despacho del Par D — Fase 2',
  title_en: 'Pair D Dispatch — Stage 2',
  authors: ['J. Serrano'],
  date: new Date('2026-04-30'),
  type: 'decision-memo' as const,
  // Plan B: track + readable_on_site are now required on PublicationCardResearch
  track: 'abrigo-hedge-design' as const,
  readable_on_site: false,
  summary_es: 'Resumen del análisis de Par D en la fase 2.',
  summary_en: 'Summary of the Pair D Stage 2 analysis.',
  tags: ['pair-d', 'ols'],
}

function mockT(key: string): string {
  const keys: Record<string, string> = {
    'research.cta.read_document': 'Read document',
    'research.cta.read_on_site': 'Read on site',
    'research.type_label.decision-memo': 'Memo',
    'research.type_label.paper': 'Paper',
    'research.type_label.write-up': 'Write-up',
    'research.type_label.talk': 'Talk',
    'research.track_label.abrigo-hedge-design': 'Abrigo Hedge-Design',
    'research.track_label.cfmm-microstructure': 'CFMM Microstructure',
    'research.track_label.notes': 'Notes',
    'research.track_filter.label': 'Filter by track',
    'research.track_filter.all': 'All',
  }
  return keys[key] ?? key
}

describe('<PublicationCard />', () => {
  it('renders H3 title', () => {
    render(<PublicationCard research={baseResearch} locale="en" t={mockT} />)
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.textContent).toContain('Pair D Dispatch')
  })

  it('renders type Badge', () => {
    const { container } = render(<PublicationCard research={baseResearch} locale="en" t={mockT} />)
    // Badge renders as a span with data-slot="badge"
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
  })

  it('renders order prefix in font-mono text-accent-text when order prop is provided', () => {
    const { container } = render(
      <PublicationCard research={{ ...baseResearch, order: 1 }} locale="en" t={mockT} />,
    )
    // text-accent-text = AA-safe darker ochre for small text (Plan 03.1-04 contrast fix)
    const prefix = container.querySelector('.font-mono.text-accent-text')
    expect(prefix).toBeInTheDocument()
    expect(prefix?.textContent).toBe('01')
  })

  it('renders Read document link with ArrowUpRight when external_url present', () => {
    render(
      <PublicationCard
        research={{ ...baseResearch, external_url: 'https://arxiv.org/example' }}
        locale="en"
        t={mockT}
      />,
    )
    const link = screen.getByRole('link', { name: /Read document/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('contains 2-line clamp class on abstract', () => {
    const { container } = render(<PublicationCard research={baseResearch} locale="en" t={mockT} />)
    const abstract = container.querySelector('.line-clamp-2')
    expect(abstract).toBeInTheDocument()
  })
})
