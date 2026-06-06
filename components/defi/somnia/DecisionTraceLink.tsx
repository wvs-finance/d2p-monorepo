// DecisionTraceLink — RSC master→detail link affordance for each HedgeDecisionCard.
// RSC — server component, no client directive.
//
// CROSS-09: color is NOT the sole link signal.
//   - text-accent-text (color)
//   - ChevronRight icon (shape)
//   - hover:underline (text decoration)
// The affordance is IDENTICAL for every card regardless of action (equal-weight invariant).
//
// Props:
//   requestId — the decision's size-leg requestId (= HedgeDecisionView.decisionId, the route key)
//   label     — pre-translated link label text (trace.linkLabel from the RSC page)

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface DecisionTraceLinkProps {
  requestId: string
  label: string
}

export function DecisionTraceLink({ requestId, label }: DecisionTraceLinkProps) {
  return (
    <Link
      href={`/apps/abrigo/agent/${requestId}`}
      className="inline-flex items-center gap-1 text-sm text-accent-text hover:text-accent-hover hover:underline"
    >
      <span>{label}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </Link>
  )
}
