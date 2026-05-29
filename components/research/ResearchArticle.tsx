// ResearchArticle — RSC. Renders a compiled MDX body through the resurrected
// MDXRenderer, injecting the research component map via the `components` PROP
// (NOT useMDXComponents — see components/MDXRenderer.tsx for why the prop is the
// only working injection path under Velite's function-body output).
//
// The body renders inside the ~64ch prose measure. Figures/equations/tables opt
// into a wider bleed via `.research-figure[data-fullwidth]` / `.katex-display`
// rules defined on the reading page; this wrapper just establishes the measure.

import { MDXRenderer } from '@/components/MDXRenderer'

export interface ResearchArticleProps {
  code: string
  components: Record<string, React.ComponentType<Record<string, unknown>>>
}

export function ResearchArticle({ code, components }: ResearchArticleProps): React.JSX.Element {
  return (
    <article className="research-prose max-w-[64ch] text-text-primary leading-relaxed [&_p]:my-4">
      <MDXRenderer code={code} components={components} />
    </article>
  )
}
