// Route-scoped layout for /research/* — pure RSC.
// Imports katex.min.css to scope KaTeX styles to this route group only.
// Next.js includes a layout's CSS only for routes that use that layout,
// so KaTeX styles do NOT leak to other route groups. Turbopack-safe.
//
// FONTS / LCP (Plan C2, 03.1-04 — v1 approach, NO Python byte-subsetting):
//   katex.min.css ships its faces with `font-display: block` (FOIT) and URLs that
//   Turbopack rewrites to hashed /_next/static/media/* paths NOT knowable at author
//   time — so a preload of an author-time path 404s (Wave 1 commit 4117fc3 proved
//   a /static/katex/*.woff2 preload pointed at a file that did NOT exist → 4×404 +
//   console errors, and the swap override was inert because the asset was absent).
//   FIX: the 2 critical faces (KaTeX_Main-Regular, KaTeX_Math-Italic — the glyphs that
//   dominate rendered-math LCP) are now copied verbatim to public/static/katex/ (served
//   by Next at a STABLE /static/katex/* path, NOT rewritten by Turbopack), preloaded
//   from that stable path, and overridden with `font-display: swap` via a route-scoped
//   @font-face that wins over the bundled `block` default for those two families only.
//   The remaining ~15 KaTeX faces keep the bundled @font-face (not on the LCP critical
//   path). Byte-level subsetting (fonttools/pyftsubset) is DEFERRED to v2 — see
//   docs/03.1-RENDER-PATH.md.
//
// CRITICAL: Do NOT import wagmi, RainbowKit, viem, or @tanstack/react-query
// here — this is under (lab) which enforces the bundle-isolation barrier (FOUND-11).
import 'katex/dist/katex.min.css'

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Preload the 2 critical KaTeX faces from a STABLE public path (resolves 200, not
          a Turbopack-hashed path). crossOrigin is required for font preloads. */}
      <link
        rel="preload"
        href="/static/katex/KaTeX_Main-Regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/static/katex/KaTeX_Math-Italic.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <style>{`
        /* font-display: swap override for the 2 LCP-critical faces (katex.min.css ships
           font-display: block / FOIT). Declared after the CSS import → wins for these two
           families. Same family names KaTeX uses, so the rendered math binds to these. */
        @font-face {
          font-family: KaTeX_Main;
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url(/static/katex/KaTeX_Main-Regular.woff2) format("woff2");
        }
        @font-face {
          font-family: KaTeX_Math;
          font-style: italic;
          font-weight: 400;
          font-display: swap;
          src: url(/static/katex/KaTeX_Math-Italic.woff2) format("woff2");
        }
        /* Mobile: display equations scroll horizontally at narrow viewports (WCAG 1.4.10) */
        .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
        }
      `}</style>
      {children}
    </>
  )
}
