// Server Component (RSC) — no client directive.
// Resurrects the 6-line MDXRenderer from git 5056bb7^ and EXTENDS it with an
// optional `components` prop.
//
// WHY components IS REQUIRED (not optional at runtime):
// Velite@0.3.1 compiles MDX with outputFormat:'function-body' and NO providerImportSource.
// Custom components (e.g. <Figure>, <TheoremBlock>) resolve ONLY via the components PROP
// passed to the compiled default export — NOT via useMDXComponents().
// A renderer that calls <C /> without a components prop THROWS on any body containing
// custom components. Always pass at least an empty map: components={{}}.
import * as runtime from 'react/jsx-runtime'

export interface MDXRendererProps {
  code: string
  components?: Record<string, React.ComponentType<Record<string, unknown>>>
}

export function MDXRenderer({ code, components }: MDXRendererProps): React.JSX.Element {
  const C = new Function(code)(runtime).default as (props: {
    components?: Record<string, React.ComponentType<Record<string, unknown>>>
  }) => React.JSX.Element
  // exactOptionalPropertyTypes: never spread `undefined` into optional props.
  // When components is provided, pass it explicitly; otherwise omit the prop.
  return components != null ? <C components={components} /> : <C />
}
