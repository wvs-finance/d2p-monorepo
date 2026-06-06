/**
 * liveness-pill.test.tsx — TDD tests for LivenessPill
 * Phase 07-02: snapshot/polling only (no live branch), hydration-stable first paint.
 *
 * MAJOR-8: first-paint assertion — rendered text on mount equals snapshot strings.snapshot.
 * MAJOR-13: no live branch (precise regex, not naive grep -w live).
 * CROSS-09: color + icon + text + aria-label.
 *
 * Note: LivenessPill accepts liveness='snapshot'|'polling' as a plain serializable string
 * (functions cannot cross the RSC→client serialization boundary). The LivenessSource is
 * constructed inside the component via useMemo(snapshotSource, [strings.snapshot]).
 */
import { LivenessPill, type LivenessPillStrings } from '@/components/defi/somnia/LivenessPill'
import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal strings fixture (mirrors UI-SPEC copy keys)
// ---------------------------------------------------------------------------
const strings: LivenessPillStrings = {
  snapshot: 'snapshot · —',
  polling: 'polling',
  ariaSnapshot: 'Refresh state: snapshot — recorded data, no live update.',
  ariaPolling: 'Refresh state: periodic polling.',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LivenessPill (snapshot/polling only, hydration-stable)', () => {
  it('renders snapshot state: CircleDashed icon + snapshot text + neutral className', () => {
    const { container } = render(<LivenessPill liveness="snapshot" strings={strings} />)

    // Should render the snapshot text
    const text = container.textContent ?? ''
    expect(text).toContain(strings.snapshot)

    // Should use neutral className (no status-pass/green/emerald)
    expect(container.innerHTML).not.toMatch(/status-pass|green|emerald/)

    // Should contain an svg (CircleDashed icon)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders correct aria-label for snapshot state (CROSS-09)', () => {
    const { container } = render(<LivenessPill liveness="snapshot" strings={strings} />)

    // The pill span should have the aria-label for snapshot
    const pill = container.querySelector('[aria-label]')
    expect(pill?.getAttribute('aria-label')).toBe(strings.ariaSnapshot)
  })

  it('MAJOR-8: first-paint text equals snapshot strings label (hydration parity)', () => {
    // The component renders strings.snapshot immediately on first paint
    // (snapshotSource seed === strings.snapshot; getServerSnapshot === getSnapshot)
    const { container } = render(<LivenessPill liveness="snapshot" strings={strings} />)

    // Immediately after render (no async), text must match the server-rendered text
    const text = container.textContent ?? ''
    expect(text).toContain(strings.snapshot)
  })

  it('renders polling state: RefreshCw icon + polling text', () => {
    const { container } = render(<LivenessPill liveness="polling" strings={strings} />)

    // Should render the polling text
    const text = container.textContent ?? ''
    expect(text).toContain(strings.polling)

    // Should contain an svg (RefreshCw icon)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders correct aria-label for polling state (CROSS-09)', () => {
    const { container } = render(<LivenessPill liveness="polling" strings={strings} />)

    const pill = container.querySelector('[aria-label]')
    expect(pill?.getAttribute('aria-label')).toBe(strings.ariaPolling)
  })

  it('uses neutral className for both states (no status-pass/green/emerald)', () => {
    const { container: c1 } = render(<LivenessPill liveness="snapshot" strings={strings} />)
    expect(c1.innerHTML).not.toMatch(/status-pass|green|emerald/)

    const { container: c2 } = render(<LivenessPill liveness="polling" strings={strings} />)
    expect(c2.innerHTML).not.toMatch(/status-pass|green|emerald/)
  })

  it('uses the verbatim CROSS-09 pill shell className', () => {
    const { container } = render(<LivenessPill liveness="snapshot" strings={strings} />)
    // Check for the WalletStatusPill shell string (verbatim)
    expect(container.innerHTML).toContain(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset',
    )
  })

  it('no live render branch: does not render live text for snapshot liveness', () => {
    const { container } = render(<LivenessPill liveness="snapshot" strings={strings} />)

    // The rendered text should NOT contain a 'live' state label
    // (Precise: not matching 'live' as a standalone render state)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/^live$|\blive\b(?!ness|nesssource)/i)
  })

  it('no details collapse element rendered', () => {
    const { container } = render(<LivenessPill liveness="snapshot" strings={strings} />)
    expect(container.querySelector('details')).toBeNull()
  })
})
