import { StatusPill } from '@/components/StatusPill'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('<StatusPill />', () => {
  it('renders icon + color class + text for PASS', () => {
    const { container } = render(<StatusPill status="PASS" label="Approved" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('text-status-pass')
  })

  it('renders icon + color class + text for FAIL', () => {
    const { container } = render(<StatusPill status="FAIL" label="Failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('text-status-fail')
  })

  it('renders icon + color class + text for PARKED', () => {
    const { container } = render(<StatusPill status="PARKED" label="Parked" />)
    expect(screen.getByText('Parked')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('text-status-parked')
  })

  it('renders icon + color class + text for IN_PROGRESS', () => {
    const { container } = render(<StatusPill status="IN_PROGRESS" label="In Progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('text-status-in-progress')
  })

  it('text label is a real DOM text node, present even if CSS is stripped (CROSS-09)', () => {
    const { container } = render(<StatusPill status="PASS" label="Approved" />)
    const textContent = container.textContent
    expect(textContent).toContain('Approved')
    // The text is NOT inside an sr-only span
    const srOnly = container.querySelector('.sr-only')
    if (srOnly) {
      expect(srOnly.textContent).not.toBe('Approved')
    }
  })

  it('icon has aria-hidden so screen readers do not announce it twice', () => {
    const { container } = render(<StatusPill status="PASS" label="Approved" />)
    const icon = container.querySelector('svg')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})
