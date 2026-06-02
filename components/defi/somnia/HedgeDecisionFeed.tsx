// HedgeDecisionFeed — RSC feed of hedge decisions from the Wave-0 reader seam.
// RSC — no 'use client'. Pure presentational.
//
// Reads decisions via getHedgeDecisions() (snapshot default / live when SOMNIA_LIVE is set).
// Maps each decision to a HedgeDecisionCard at equal visual weight (CROSS-09 anti-fishing).
// All four actions (HOLD / ADD_LONG_GAMMA / REDUCE / EXIT) render at IDENTICAL weight.
// consensus is labeled operator-supplied; surprise is gated behind that caveat.
// testnet-agent provenance pill (recorded sub-state) per card.
//
// Props: strings + locale threaded from RSC page (no getTranslations inside this component).

import { HedgeDecisionCard } from '@/components/defi/somnia/HedgeDecisionCard'
import type { DecisionCardStrings } from '@/components/defi/somnia/HedgeDecisionCard'
import { getHedgeDecisions } from '@/lib/apps/abrigo/somnia/reader'

interface HedgeDecisionFeedProps {
  strings: DecisionCardStrings & {
    /** Feed heading label */
    feedHeading?: string | undefined
    /** Empty-state copy for the feed (zero decisions) */
    feedEmptyState?: string | undefined
  }
  locale: string
  /** Optional data key to filter decisions (defaults to reader default) */
  dataKey?: string | undefined
}

export function HedgeDecisionFeed({ strings, locale, dataKey }: HedgeDecisionFeedProps) {
  const decisions = getHedgeDecisions(dataKey)

  if (decisions.length === 0) {
    return (
      <section
        data-testid="hedge-decision-feed"
        aria-label={strings.feedHeading ?? 'Decisiones de cobertura'}
      >
        <p className="text-sm text-text-muted">{strings.feedEmptyState ?? strings.emptyState}</p>
      </section>
    )
  }

  return (
    <section
      data-testid="hedge-decision-feed"
      aria-label={strings.feedHeading ?? 'Decisiones de cobertura'}
    >
      {/* Feed heading (optional — page already has an h1) */}
      {strings.feedHeading ? (
        <h2 className="text-xl font-semibold text-text-primary mb-4">{strings.feedHeading}</h2>
      ) : null}

      {/* Equal-weight card list — CROSS-09: identical spacing/sizing for every card */}
      <div className="space-y-4">
        {decisions.map((decision) => (
          <HedgeDecisionCard
            key={decision.decisionId}
            decision={decision}
            strings={strings}
            locale={locale}
          />
        ))}
      </div>
    </section>
  )
}
