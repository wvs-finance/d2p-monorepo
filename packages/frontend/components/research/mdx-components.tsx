// Research MDX component map — a SINGLE module exporting the map passed to
// MDXRenderer via its `components` PROP (Velite compiles function-body with no
// providerImportSource, so the prop is the ONLY injection path — useMDXComponents
// is a no-op here, see components/MDXRenderer.tsx).
//
// ALL entries are SERVER components. The PaperBridge client island is
// intentionally NOT imported here — keeping this map free of any client-directive
// import prevents a stray client boundary from pulling the whole map client-side.
// The page composes <PaperBridge> directly, outside the compiled body.
//
// rehype-slug already adds `id` to headings and rehype-autolink-headings wraps an
// anchor; our h2/h3 overrides just apply the prose typography + scroll-margin so
// the TOC anchor jumps land below the sticky TopNav.

import { Figure } from '@/components/research/Figure'
import { Sidenote } from '@/components/research/Sidenote'
import { TheoremBlock } from '@/components/research/TheoremBlock'

type MdxComponentMap = Record<string, React.ComponentType<Record<string, unknown>>>

function H2(props: React.ComponentProps<'h2'>): React.JSX.Element {
  return <h2 {...props} className="mt-10 scroll-mt-24 text-2xl font-semibold text-text-primary" />
}

function H3(props: React.ComponentProps<'h3'>): React.JSX.Element {
  return <h3 {...props} className="mt-8 scroll-mt-24 text-xl font-semibold text-text-primary" />
}

// Locale-bound map factory: TheoremBlock and Figure need the active locale to pick
// their label word ("Theorem"/"Teorema", "Figure"/"Figura"). The compiled body
// passes through `kind`/`label`/`fullwidth` hProperties; we inject `locale` here.
export function getResearchComponents(locale: 'es' | 'en'): MdxComponentMap {
  const BoundTheoremBlock = (props: Record<string, unknown>) => (
    <TheoremBlock {...props} locale={locale} />
  )
  const BoundFigure = (props: Record<string, unknown>) => <Figure {...props} locale={locale} />

  return {
    h2: H2 as React.ComponentType<Record<string, unknown>>,
    h3: H3 as React.ComponentType<Record<string, unknown>>,
    Figure: BoundFigure as React.ComponentType<Record<string, unknown>>,
    TheoremBlock: BoundTheoremBlock as React.ComponentType<Record<string, unknown>>,
    Sidenote: Sidenote as React.ComponentType<Record<string, unknown>>,
  }
}
