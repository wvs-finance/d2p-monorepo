// @vitest-environment jsdom
import { BetaCIChart } from '@/components/BetaCIChart'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('<BetaCIChart />', () => {
  const baseProps = {
    beta: 0.137,
    ciLower: 0.092,
    ciUpper: 0.182,
  }

  it('renders an svg with role="img" and aria-label containing β value', () => {
    const { container } = render(<BetaCIChart {...baseProps} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute('role')).toBe('img')
    const ariaLabel = svg?.getAttribute('aria-label') ?? ''
    expect(ariaLabel).toContain('0.1370')
  })

  it('includes sr-only table with β, CI lower, CI upper rows', () => {
    const { container } = render(<BetaCIChart {...baseProps} />)
    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()
    const tableText = table?.textContent ?? ''
    expect(tableText).toContain('β')
    expect(tableText).toContain('CI lower')
    expect(tableText).toContain('CI upper')
  })

  it('renders a circle at the β position and line elements for CI whisker', () => {
    const { container } = render(<BetaCIChart {...baseProps} />)
    const circle = container.querySelector('circle')
    expect(circle).toBeInTheDocument()
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })

  it('zero-reference line is present with stroke-dasharray', () => {
    const { container } = render(<BetaCIChart {...baseProps} />)
    const dashedLine = container.querySelector('line[stroke-dasharray]')
    expect(dashedLine).toBeInTheDocument()
    expect(dashedLine?.getAttribute('stroke-dasharray')).toBe('3 3')
  })

  it('viewBox is "0 0 300 60"', () => {
    const { container } = render(<BetaCIChart {...baseProps} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 60')
  })
})
