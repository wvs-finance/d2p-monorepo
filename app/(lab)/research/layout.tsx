// Route-scoped layout for /research/* — pure RSC.
// Imports katex.min.css to scope KaTeX styles to this route group only.
// Next.js includes a layout's CSS only for routes that use that layout,
// so KaTeX styles do NOT leak to other route groups. Turbopack-safe.
//
// Font preloads: KaTeX_Main-Regular + KaTeX_Math-Italic (the two most-used
// KaTeX faces for body text and math italic). font-display:swap is applied
// via the @font-face override below so FOUC is minimised on 3G connections.
// Byte-level subsetting (fonttools/pyftsubset) is DEFERRED to v2.
//
// CRITICAL: Do NOT import wagmi, RainbowKit, viem, or @tanstack/react-query
// here — this is under (lab) which enforces the bundle-isolation barrier (FOUND-11).
import 'katex/dist/katex.min.css'

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* KaTeX font preloads — the 2 most-used faces (LCP approach; v1).
          crossOrigin="anonymous" is required for CORS-safe font preload in browsers. */}
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/static/katex/KaTeX_Main-Regular.woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        as="font"
        type="font/woff2"
        href="/static/katex/KaTeX_Math-Italic.woff2"
        crossOrigin="anonymous"
      />
      {/* font-display:swap override for KaTeX faces to avoid invisible-text FOUC */}
      <style>{`
        @font-face {
          font-family: KaTeX_Main;
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url('/static/katex/KaTeX_Main-Regular.woff2') format('woff2');
        }
        @font-face {
          font-family: KaTeX_Math;
          font-style: italic;
          font-weight: 400;
          font-display: swap;
          src: url('/static/katex/KaTeX_Math-Italic.woff2') format('woff2');
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
