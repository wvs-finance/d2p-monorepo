'use client'

// PaperBridge — the SOLE 'use client' island in the research reading surface.
//
// Renders the off-site bridge: arXiv abstract link, PDF link, DOI link, and a
// copy-able static BibTeX block. NO citation-rendering libraries (v2 deferral) —
// the BibTeX is a plain authored string copied verbatim to the clipboard.
//
// Clipboard pattern reused from components/ReplicationHash.tsx (git 5056bb7^):
// navigator.clipboard.writeText + transient <output> tooltip + swallow errors.

import { ArrowUpRight, ClipboardCopy } from 'lucide-react'
import { useState } from 'react'

export interface PaperBridgeLabels {
  /** "Read the full paper on arXiv" / "Leer el artículo completo en arXiv" */
  arxiv: string
  /** "PDF" */
  pdf: string
  /** "DOI" */
  doi: string
  /** "Copy BibTeX" / "Copiar BibTeX" (button aria-label) */
  copy: string
  /** "Copied!" / "¡Copiado!" (transient tooltip) */
  copied: string
  /** "BibTeX" heading above the <pre> */
  bibtex_heading: string
}

export interface PaperBridgeProps {
  arxivAbs?: string
  arxivPdf?: string
  pdfUrl?: string
  doi?: string
  bibtex?: string
  labels: PaperBridgeLabels
}

function ExternalLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent-default underline-offset-2 hover:underline"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}

export function PaperBridge({
  arxivAbs,
  arxivPdf,
  pdfUrl,
  doi,
  bibtex,
  labels,
}: PaperBridgeProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!bibtex) return
    try {
      await navigator.clipboard.writeText(bibtex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Silently swallow clipboard errors — do not crash UI.
    }
  }

  const pdfHref = arxivPdf ?? pdfUrl
  const hasAnything = arxivAbs || pdfHref || doi || bibtex
  if (!hasAnything) return null

  return (
    <aside className="mt-12 rounded-md border border-border-default bg-bg-surface p-6">
      <div className="flex flex-wrap items-center gap-4">
        {arxivAbs && <ExternalLink href={arxivAbs}>{labels.arxiv}</ExternalLink>}
        {pdfHref && <ExternalLink href={pdfHref}>{labels.pdf}</ExternalLink>}
        {doi && <ExternalLink href={`https://doi.org/${doi}`}>{labels.doi}</ExternalLink>}
      </div>

      {bibtex && (
        <div className="mt-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
              {labels.bibtex_heading}
            </span>
            <span className="relative">
              <button
                type="button"
                onClick={handleCopy}
                aria-label={labels.copy}
                className="inline-flex items-center text-text-muted transition-colors hover:text-accent-default active:text-accent-default"
              >
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {copied && (
                <output className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-primary shadow-sm">
                  {labels.copied}
                </output>
              )}
            </span>
          </div>
          <pre className="overflow-x-auto rounded border border-border-default bg-bg-canvas p-3 font-mono text-xs text-text-secondary">
            <code>{bibtex}</code>
          </pre>
        </div>
      )}
    </aside>
  )
}
