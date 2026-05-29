// GATING SPIKE PAGE — Plan A (03.1-01)
// This temporary route exists ONLY to prove the KaTeX math render path and the
// custom-component injection path work end-to-end before Plan C builds the real
// [slug] reading page. Plan C will remove this route.
//
// Route: /research/spike  (NO underscore — _spike would be non-routable in Next.js)
// Layout: inherits app/(lab)/research/layout.tsx → KaTeX CSS + font preload
// Rendering: finds the spike-katex entry with locale === 'es', renders via MDXRenderer
//            with stub components so both the math path AND the components-prop path
//            are exercised together on a real prod-build route.
import { research } from '@/.velite'
import { MDXRenderer } from '@/components/MDXRenderer'

// ── Stub components ───────────────────────────────────────────────────────────
// Minimal stubs for the component map — exist ONLY to prove the injection path.
// Plan C replaces these with the real TheoremBlock, Figure, etc.
function StubTheoremBlock({
  kind,
  label,
  children,
}: {
  kind?: string
  label?: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <aside
      data-testid="theorem-block"
      data-kind={kind ?? 'theorem'}
      style={{
        borderLeft: '3px solid oklch(0.6 0.08 70)',
        paddingLeft: '1rem',
        margin: '1.5rem 0',
      }}
    >
      {label ? (
        <strong style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>
          {kind ? `${kind.charAt(0).toUpperCase()}${kind.slice(1)}` : 'Theorem'}
          {label ? ` (${label})` : ''}
        </strong>
      ) : null}
      <div>{children}</div>
    </aside>
  )
}

// Component map passed to MDXRenderer — proves the components-prop injection path.
// TheoremBlock is the key custom component exercised by the :::theorem directive.
const spikeComponents = {
  TheoremBlock: StubTheoremBlock as React.ComponentType<Record<string, unknown>>,
}

export default function ResearchSpikePage(): React.JSX.Element {
  // Find the spike-katex entry in the es locale (the primary authored locale).
  // Falls back to the en entry if es is not found (should not happen in a correct build).
  const entry =
    research.find((r) => r.slug === 'spike-katex' && r.locale === 'es') ??
    research.find((r) => r.slug === 'spike-katex')

  if (!entry) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Spike fixture not found</h1>
        <p>
          Run <code>pnpm exec velite build</code> to compile the spike fixtures.
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '65ch', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 600 }}>
          {entry.title_es}
        </h1>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.875rem',
            color: 'oklch(0.5 0.02 250)',
          }}
        >
          Spike · locale: {entry.locale} · {entry.date.toISOString().split('T')[0]}
        </p>
      </header>
      <article className="prose">
        <MDXRenderer code={entry.body} components={spikeComponents} />
      </article>
    </main>
  )
}
