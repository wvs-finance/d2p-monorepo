/**
 * management-controls.test.tsx — TDD RED stubs for ManagementControls
 * Phase 07-02: exactly three disabled buttons (close/claim/agent), each with
 * native disabled + aria-disabled='true' + aria-describedby → single caption id.
 *
 * MAJOR-12: mechanical per-button attribute assertions (no "reviewer confirms" escape hatch).
 * MAJOR-13: rendered DOM text assertions (not naive grep on source).
 * MAJOR-10: no <details> element rendered.
 */
import {
  ManagementControls,
  type ManagementControlsStrings,
} from '@/components/defi/somnia/ManagementControls'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal strings fixture (mirrors UI-SPEC copy keys)
// ---------------------------------------------------------------------------
const strings: ManagementControlsStrings = {
  close: 'Close',
  claim: 'Claim residual',
  agent: 'Agent control',
  caption: 'Unavailable — fork-verified, not deployed. No transaction.',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ManagementControls (disabled, perceivable beyond color)', () => {
  it('renders with data-testid management-controls', () => {
    render(<ManagementControls strings={strings} />)
    expect(screen.getByTestId('management-controls')).toBeDefined()
  })

  it('renders EXACTLY 3 buttons', () => {
    render(<ManagementControls strings={strings} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
  })

  it('each button is natively disabled (disabled === true)', () => {
    render(<ManagementControls strings={strings} />)
    const buttons = screen.getAllByRole('button', { hidden: true })
    // getAllByRole with hidden:true still returns disabled buttons
    for (const btn of buttons) {
      expect((btn as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('each button has aria-disabled="true" (MAJOR-12)', () => {
    render(<ManagementControls strings={strings} />)
    // Native disabled hides from accessible tree; query by testid container to get DOM buttons
    const container = screen.getByTestId('management-controls')
    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-disabled')).toBe('true')
    }
  })

  it('each button has its own aria-describedby pointing at the caption id (MAJOR-12)', () => {
    render(<ManagementControls strings={strings} />)
    const container = screen.getByTestId('management-controls')
    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(3)

    // All three must reference the same caption id
    const captionId = buttons[0]?.getAttribute('aria-describedby') ?? null
    expect(captionId).toBeTruthy()

    for (const btn of buttons) {
      // Each button has its OWN aria-describedby attribute (not one shared attr)
      expect(btn.getAttribute('aria-describedby')).toBe(captionId)
    }

    // The caption element with that id must exist
    const caption = captionId ? document.getElementById(captionId) : null
    expect(caption).not.toBeNull()
    expect(caption?.textContent).toBe(strings.caption)
  })

  it('each button contains a Lock svg icon (MAJOR-12 — color + icon + text)', () => {
    render(<ManagementControls strings={strings} />)
    const container = screen.getByTestId('management-controls')
    const buttons = container.querySelectorAll('button')
    for (const btn of buttons) {
      // lucide-react renders an <svg> inside the button
      expect(btn.querySelector('svg')).not.toBeNull()
    }
  })

  it('renders button labels: Close, Claim residual, Agent control', () => {
    render(<ManagementControls strings={strings} />)
    expect(screen.getByText(strings.close)).toBeDefined()
    expect(screen.getByText(strings.claim)).toBeDefined()
    expect(screen.getByText(strings.agent)).toBeDefined()
  })

  it('renders the persistent inline caption', () => {
    render(<ManagementControls strings={strings} />)
    expect(screen.getByText(strings.caption)).toBeDefined()
  })

  it('rendered text contains no executed/realized/placed/ejecutad/realizad (MAJOR-13)', () => {
    const { container } = render(<ManagementControls strings={strings} />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/executed|realized|placed|ejecutad|realizad/)
  })

  it('no <details> element rendered (MAJOR-10)', () => {
    const { container } = render(<ManagementControls strings={strings} />)
    expect(container.querySelector('details')).toBeNull()
  })
})
