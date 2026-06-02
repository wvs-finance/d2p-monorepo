'use client'

// Route error boundary for the per-instrument detail page.
// Next.js requires error.tsx to be a client component.
// Locked copy from 05-04 plan (instruments.errors.*):
//   es-CO: "Algo salió mal al cargar esta página." + "Volver al inicio"
//   en: "Something went wrong loading this page." + "Back to home"
// Locale is read from the document (best-effort); falls back to es-CO.

import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function InstrumentDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for diagnostics; do not surface internal details to users.
    console.error('[InstrumentDetailError]', error)
  }, [error])

  // Best-effort locale detection from document cookie (client component).
  const locale =
    typeof document !== 'undefined' &&
    document.cookie.split(';').some((c) => c.trim().startsWith('NEXT_LOCALE=en'))
      ? 'en'
      : 'es-CO'

  const heading =
    locale === 'en'
      ? 'Something went wrong loading this page.'
      : 'Algo salió mal al cargar esta página.'
  const backLabel = locale === 'en' ? 'Back to home' : 'Volver al inicio'
  const retryLabel = locale === 'en' ? 'Try again' : 'Intentar de nuevo'

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-12">
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-base font-semibold text-text-primary">{heading}</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="text-sm font-normal text-accent-text underline underline-offset-4 hover:text-accent-default transition-colors"
          >
            {retryLabel}
          </button>
          <Link
            href="/"
            className="text-sm font-normal text-accent-text underline underline-offset-4 hover:text-accent-default transition-colors"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  )
}
