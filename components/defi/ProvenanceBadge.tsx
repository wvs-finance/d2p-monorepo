// ProvenanceBadge — provenance-tier pills + SIMULADO badge (Wave 2, CROSS-09/DEFI-08).
// RSC — no 'use client' needed; pure presentational.
// CROSS-09: color + icon + text + aria-label; never color alone.
// Non-text contrast: FULL-opacity ring (1.4.11 ≥3:1 cleared for all three tiers).
// Tokens from globals.css:
//   fork-fixture → text-status-parked ring-status-parked bg-status-parked/10
//   spec         → text-status-in-progress ring-status-in-progress bg-status-in-progress/10
//   schematic    → text-text-muted ring-border-default bg-bg-surface

import { Database, FileText, FlaskConical, PenLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// ProvenanceTier union
// ---------------------------------------------------------------------------

export type ProvenanceTier = 'fork-fixture' | 'spec' | 'schematic'

// ---------------------------------------------------------------------------
// Internal config map — matches the WalletStatusPill pattern
// ---------------------------------------------------------------------------

interface ProvenanceConfig {
  Icon: LucideIcon
  className: string
}

const TIER_CONFIG: Record<ProvenanceTier, ProvenanceConfig> = {
  'fork-fixture': {
    Icon: Database,
    // FULL-opacity ring for WCAG 1.4.11 ≥3:1 non-text contrast
    className: 'text-status-parked ring-status-parked bg-status-parked/10',
  },
  spec: {
    Icon: FileText,
    className: 'text-status-in-progress ring-status-in-progress bg-status-in-progress/10',
  },
  schematic: {
    Icon: PenLine,
    className: 'text-text-muted ring-border-default bg-bg-surface',
  },
}

// ---------------------------------------------------------------------------
// ProvenancePill — small inline pill for per-field provenance
// ---------------------------------------------------------------------------

interface ProvenancePillProps {
  tier: ProvenanceTier
  /** The data field this pill is attached to (used by callers for semantics) */
  fieldName: string
  /** Locale-aware visible label (e.g. es-CO "Especificación", en "Specification"). */
  label: string
  /** Full provenance sentence for screen readers: "Fuente: fork-fixture — …" */
  ariaLabel: string
}

export function ProvenancePill({ tier, label, ariaLabel }: ProvenancePillProps) {
  const { Icon, className } = TIER_CONFIG[tier]

  // Reuse the EXACT WalletStatusPill shell string (CROSS-09 invariant).
  // The <span> wrapper carries aria-label (the full provenance sentence);
  // visible text is the LOCALE-AWARE label (NOT the raw tier key — es-CO first).
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset ${className}`}
      aria-label={ariaLabel}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// SimuladoBadge — prominent badge for simulated (fork-only) instruments
// ---------------------------------------------------------------------------

interface SimuladoBadgeProps {
  /** Visible badge label (locale-aware). Defaults to "SIMULADO" for backward compat. */
  label?: string | undefined
  /** Full sentence for screen readers: "Instrumento simulado — no ha sido desplegado en cadena" */
  ariaLabel: string
}

export function SimuladoBadge({ label = 'SIMULADO', ariaLabel }: SimuladoBadgeProps) {
  // NOT the small pill — uses status-parked (amber) to signal non-production.
  // Visible at 360px (text-sm, not truncated).
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset text-status-parked ring-status-parked bg-status-parked/10"
      aria-label={ariaLabel}
    >
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
