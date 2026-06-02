// RiskCallout — RSC, persistent risk disclosure (DEFI-05).
// NOT dismissible — no button, no <details>, no toast.
// Full 4-side hairline border: `border border-accent-default` (never one-sided).
// Heading: text-accent-text (WCAG AA for small text < 18.66px).
// Caller passes already-translated strings from getTranslations('instruments').

interface RiskCalloutProps {
  /** Translated heading string (e.g. "Instrumento de cobertura — no es apalancamiento") */
  heading: string
  /** Translated body string */
  body: string
}

export function RiskCallout({ heading, body }: RiskCalloutProps) {
  return (
    <aside
      aria-label={heading}
      className="border border-accent-default rounded-[var(--radius)] px-4 py-3 space-y-1"
    >
      <p className="text-xl font-semibold text-accent-text">{heading}</p>
      <p className="text-base font-normal text-text-primary leading-relaxed">{body}</p>
    </aside>
  )
}
