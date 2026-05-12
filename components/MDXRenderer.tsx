// Server Component (RSC) — no client directive.
// Renders Velite-compiled MDX code string using React JSX runtime.
// The `code` prop is the output of Velite's s.mdx() schema field —
// a self-contained component factory function string.

import * as runtime from 'react/jsx-runtime'

export interface MDXRendererProps {
  /** Compiled MDX code string from Velite s.mdx() output */
  code: string
}

export function MDXRenderer({ code }: MDXRendererProps): React.JSX.Element {
  // Evaluate the Velite-compiled MDX factory with React JSX runtime.
  // new Function() is the Velite-recommended pattern for RSC MDX rendering.
  const MdxComponent = new Function(code)(runtime).default as () => React.JSX.Element
  return <MdxComponent />
}
