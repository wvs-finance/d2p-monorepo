// @vitest-environment jsdom
import { NumberedStep } from '@/components/NumberedStep'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('<NumberedStep />', () => {
  const baseProps = {
    number: '01',
    title: 'Pre-commit specification',
    body: 'Define the model, outcome variable, treatment, and expected sign before any data is loaded.',
  }

  it('renders number in font-mono text-accent-default', () => {
    const { container } = render(<NumberedStep {...baseProps} />)
    const numberEl = container.querySelector('.font-mono.text-accent-default')
    expect(numberEl).toBeInTheDocument()
    expect(numberEl?.textContent).toBe('01')
  })

  it('layout is flex-col md:flex-row (stacks number above title at <md)', () => {
    const { container } = render(<NumberedStep {...baseProps} />)
    const outer = container.querySelector('.flex-col.md\\:flex-row')
    expect(outer).toBeInTheDocument()
  })

  it('title is H3', () => {
    render(<NumberedStep {...baseProps} />)
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.textContent).toContain('Pre-commit specification')
  })

  it('body has max-w-2xl class', () => {
    const { container } = render(<NumberedStep {...baseProps} />)
    const body = container.querySelector('.max-w-2xl')
    expect(body).toBeInTheDocument()
  })
})
