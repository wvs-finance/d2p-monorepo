// DEV/E2E-ONLY DEFI-06 audit surface — guarded from production.
// Renders a non-readOnly WalletPanel wired to the mock connector so the
// Accessibility Auditor can exercise the full keyboard/focus/SR flow.
//
// Guard: 404s in production unless NEXT_PUBLIC_E2E is set (playwright webServer sets it).
// This route is PERMANENT — it's the durable regression surface for DEFI-06.

import { notFound } from 'next/navigation'
import { AuditShell } from './AuditShell'

export default function A11yWalletCheckPage() {
  // Guard: only reachable in non-production OR when NEXT_PUBLIC_E2E is explicitly set.
  // process.env.NODE_ENV is 'production' for `next build && next start` output.
  // NEXT_PUBLIC_E2E is set in playwright.config.ts webServer.env.
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_E2E) {
    notFound()
  }

  return <AuditShell />
}
