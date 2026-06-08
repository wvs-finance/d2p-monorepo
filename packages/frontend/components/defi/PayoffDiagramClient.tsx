'use client'

// PayoffDiagramClient — the 'use client' wrapper that OWNS the dynamic(ssr:false) import.
// BLOCKER-1 (B1): `ssr:false` MUST live here, NOT in the RSC page.tsx.
// In Next 16, `dynamic(..., { ssr: false })` is a build error inside a Server Component.
// The RSC detail page imports { PayoffDiagramClient } from this file — never dynamic().
// Bundle isolation is preserved: the client boundary still code-splits recharts into
// the (defi) instrument chunk (WAIVER-05-05).

import dynamic from 'next/dynamic'

const PayoffDiagram = dynamic(
  () => import('./PayoffDiagram').then((mod) => ({ default: mod.PayoffDiagram })),
  {
    ssr: false,
    // Loading skeleton must match the mounted component's h-* class to avoid React #418 hydration mismatch.
    loading: () => <div className="h-[240px] sm:h-[320px]" aria-hidden="true" />,
  },
)

export { PayoffDiagram as PayoffDiagramClient }
