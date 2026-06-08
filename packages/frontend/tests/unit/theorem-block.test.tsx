// @vitest-environment jsdom
// Phase 03.1 Plan C1 — TheoremBlock anti-fishing guard (CROSS-09: color + TEXT label, never color alone).
import { TheoremBlock } from '@/components/research/TheoremBlock'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('<TheoremBlock />', () => {
  it('renders a visible text label, not color-alone (CROSS-09)', () => {
    render(
      <TheoremBlock kind="theorem" label="Estimator convergence" locale="en">
        <p>Body prose.</p>
      </TheoremBlock>,
    )
    // The label text must be present in the DOM — a screen reader / no-color user
    // must be able to read what kind of callout this is.
    expect(screen.getByText(/theorem/i)).toBeInTheDocument()
    expect(screen.getByText(/Estimator convergence/i)).toBeInTheDocument()
  })

  it('localizes the kind label when an es label map is provided', () => {
    render(
      <TheoremBlock kind="definition" label="" locale="es">
        <p>Cuerpo.</p>
      </TheoremBlock>,
    )
    // Spanish authored-first: "definition" → "Definición"
    expect(screen.getByText(/Definici/i)).toBeInTheDocument()
  })

  it('renders its children body', () => {
    render(
      <TheoremBlock kind="lemma" label="">
        <p data-testid="theorem-body">Lemma body content.</p>
      </TheoremBlock>,
    )
    expect(screen.getByTestId('theorem-body')).toHaveTextContent('Lemma body content.')
  })
})
