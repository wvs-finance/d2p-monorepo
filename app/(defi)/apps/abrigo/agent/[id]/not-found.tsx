// /apps/abrigo/agent/[id]/not-found.tsx — 404 boundary for unknown decision ids.
// RSC — server component, no 'use client'.
//
// Called by notFound() in page.tsx when getDecisionTraceById(id) returns null.
// Returns HTTP 404 (the Next.js notFound() contract — instruments-route precedent).
// Renders trace.errorNotFound copy + a back link to /apps/abrigo/agent (trace.backToPanel).
//
// CROSS-10: es-CO copy via getTranslations('somnia').
// No inline-200 error path exists — this IS the error boundary.

import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function AgentDecisionNotFound() {
  const t = await getTranslations('somnia')

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
      <div className="space-y-4">
        {/* Honest error message — trace.errorNotFound (not a fabricated state) */}
        <p className="text-sm text-text-muted">{t('trace.errorNotFound')}</p>

        {/* Back link — returns the user to the agent overview panel */}
        <Link
          href="/apps/abrigo/agent"
          className="inline-flex items-center gap-1 text-sm text-accent-text hover:text-accent-hover hover:underline"
        >
          {t('trace.backToPanel')}
        </Link>
      </div>
    </main>
  )
}
