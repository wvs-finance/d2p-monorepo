// Apps route group layout — Client Component required for NuqsAdapter.
// NuqsAdapter wraps all (apps) children for nuqs URL state management.
// Only (apps) pages use nuqs; (lab) RSC pages are unaffected (PITFALL B avoided).
// No wallet imports — FOUND-11 compliance maintained.
'use client'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <div className="min-h-screen">{children}</div>
    </NuqsAdapter>
  )
}
