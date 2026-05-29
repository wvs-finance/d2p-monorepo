// Route-scoped layout for /research/* — pure RSC.
// Imports katex.min.css to scope KaTeX styles to this route group only.
// Next.js includes a layout's CSS only for routes that use that layout,
// so KaTeX styles do NOT leak to other route groups. Turbopack-safe.
//
// Fonts: KaTeX ships its own @font-face rules inside katex.min.css; Turbopack
// rewrites their URLs to hashed /_next/static/media/* assets that resolve 200.
// We do NOT hand-roll preloads or @font-face overrides — earlier attempts pointed
// at /static/katex/*.woff2 which does not exist (4×404 + console errors, and the
// swap override was inert). Byte-level subsetting + correct-path preload are
// DEFERRED to v2 (Plan C2 perf); v1 relies on the bundled KaTeX fonts.
//
// CRITICAL: Do NOT import wagmi, RainbowKit, viem, or @tanstack/react-query
// here — this is under (lab) which enforces the bundle-isolation barrier (FOUND-11).
import 'katex/dist/katex.min.css'

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile: display equations scroll horizontally at narrow viewports (WCAG 1.4.10) */}
      <style>{`
        .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
        }
      `}</style>
      {children}
    </>
  )
}
