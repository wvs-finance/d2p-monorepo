// @vitest-environment jsdom
import { ReplicationHash } from '@/components/ReplicationHash'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('<ReplicationHash />', () => {
  const longHash = 'abcdef1234567890'

  it('truncates display to first-8 chars + ellipsis + last-4 chars when hash has length ≥ 16', () => {
    render(
      <ReplicationHash hash={longHash} copyLabel="Copy replication hash" copiedLabel="Copied!" />,
    )
    expect(screen.getByText('abcdef12…7890')).toBeInTheDocument()
  })

  it('full hash appears in title attribute and aria-label', () => {
    const { container } = render(
      <ReplicationHash hash={longHash} copyLabel="Copy replication hash" copiedLabel="Copied!" />,
    )
    const wrapper = container.querySelector('[title]')
    expect(wrapper?.getAttribute('title')).toBe(longHash)
    expect(wrapper?.getAttribute('aria-label')).toContain(longHash)
  })

  it('copy button has aria-label from copyLabel prop', () => {
    render(
      <ReplicationHash hash={longHash} copyLabel="Copy replication hash" copiedLabel="Copied!" />,
    )
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('aria-label')).toBe('Copy replication hash')
  })

  it('click on copy button calls navigator.clipboard.writeText with the full hash', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    // Assign directly to navigator.clipboard in the global scope
    // JSDOM does not implement navigator.clipboard, so we set it explicitly
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: { writeText },
    })

    render(
      <ReplicationHash hash={longHash} copyLabel="Copy replication hash" copiedLabel="Copied!" />,
    )
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    // Allow the async click handler to execute
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(longHash)
    })
  })
})
