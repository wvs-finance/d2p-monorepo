// Sidenote — RSC PRESENTATION layer for gfm [^n] footnotes.
//
// SINGLE SOURCE OF TRUTH: footnotes are authored as gfm `[^n]` markers and a
// `[^n]: …` definition list. remark-gfm compiles them into a
// <section class="footnotes"> ... <ol> at the end of the body and inline
// <sup><a> reference markers. We do NOT author a parallel custom <Sidenote>
// directive — the gfm footnote is canonical.
//
// This component re-styles that compiled <section.footnotes> so that on lg+ the
// footnote list CSS-floats into the right margin (Tufte-style sidenotes) and on
// narrow viewports it stays inline at the bottom. The float is CSS-only (no JS) so
// the no-JS baseline still renders every footnote.
//
// USAGE: the reading page wraps the rendered body in <ResearchArticle>, whose
// container carries the `research-prose` class. The footnote float rules live in
// the route-scoped <style> on the reading page; this component documents the
// contract and provides an explicit wrapper if a page wants to render the
// footnotes section in a custom slot. In v1 the gfm-generated section is styled
// in place, so Sidenote is exported as a thin semantic wrapper for that section.

export interface SidenoteProps {
  /** aria-label for the footnotes region (translated) */
  label?: string
  children?: React.ReactNode
}

export function Sidenote({ label, children }: SidenoteProps): React.JSX.Element {
  return (
    <aside className="research-sidenote text-sm text-text-secondary" aria-label={label}>
      {children}
    </aside>
  )
}
