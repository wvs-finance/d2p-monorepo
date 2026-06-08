// @vitest-environment jsdom
// Phase 03.1 Plan C1 — PaperBridge client island: BibTeX copy-to-clipboard + arXiv/PDF/DOI links.
import { PaperBridge } from '@/components/research/PaperBridge'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const BIBTEX = `@article{serrano2026paird,
  title={Pair D Stage 2},
  author={Serrano, Juan},
  year={2026}
}`

const labels = {
  arxiv: 'Read the full paper on arXiv',
  pdf: 'PDF',
  doi: 'DOI',
  copy: 'Copy BibTeX',
  copied: 'Copied!',
  bibtex_heading: 'BibTeX',
}

describe('<PaperBridge />', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('copies the exact BibTeX string to the clipboard on copy click', async () => {
    render(<PaperBridge bibtex={BIBTEX} labels={labels} />)
    const button = screen.getByRole('button', { name: /copy bibtex/i })
    fireEvent.click(button)
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(BIBTEX)
    })
  })

  it('shows a transient "Copied!" tooltip after a successful copy', async () => {
    render(<PaperBridge bibtex={BIBTEX} labels={labels} />)
    fireEvent.click(screen.getByRole('button', { name: /copy bibtex/i }))
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('swallows clipboard failures without crashing', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<PaperBridge bibtex={BIBTEX} labels={labels} />)
    const button = screen.getByRole('button', { name: /copy bibtex/i })
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('renders an arXiv link when arxivAbs is provided', () => {
    render(
      <PaperBridge
        arxivAbs="https://arxiv.org/abs/2401.12345"
        arxivPdf="https://arxiv.org/pdf/2401.12345"
        labels={labels}
      />,
    )
    const arxivLink = screen.getByRole('link', { name: /read the full paper on arxiv/i })
    expect(arxivLink).toHaveAttribute('href', 'https://arxiv.org/abs/2401.12345')
    expect(arxivLink).toHaveAttribute('target', '_blank')
    expect(arxivLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders a DOI link as https://doi.org/{doi}', () => {
    render(<PaperBridge doi="10.1234/abcd" labels={labels} />)
    const doiLink = screen.getByRole('link', { name: /doi/i })
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/abcd')
  })

  it('renders nothing meaningful when no links and no bibtex are provided', () => {
    const { container } = render(<PaperBridge labels={labels} />)
    expect(container.querySelectorAll('a').length).toBe(0)
    expect(container.querySelector('button')).toBeNull()
  })
})
