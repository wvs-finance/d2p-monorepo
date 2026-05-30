'use client'

// WalletStatusPill — own WalletStatus union (separate from the iteration status union — LAB-05).
// Does NOT import StatusPill.tsx, does NOT share the iteration status type.
// CROSS-09: always color + icon + text, never color alone.
// M2: font-normal (400) — per the UI-SPEC 400/600 two-weight lock.

import { AlertTriangle, CheckCircle2, Loader2, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Own union — isolated from the iteration status type (LAB-05 invariant)
export type WalletStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED_WRONG_CHAIN'
  | 'CONNECTED_READY'

interface WalletStatusConfig {
  Icon: LucideIcon
  label: string
  className: string
}

// Icon map — keyed by WalletStatus
const STATUS_CONFIG: Record<WalletStatus, WalletStatusConfig> = {
  DISCONNECTED: {
    Icon: Wallet,
    label: 'Desconectado',
    className: 'text-text-muted ring-border-default bg-bg-canvas',
  },
  CONNECTING: {
    Icon: Loader2,
    label: 'Conectando',
    className: 'text-status-in-progress ring-status-in-progress/30 bg-status-in-progress/10',
  },
  CONNECTED_WRONG_CHAIN: {
    Icon: AlertTriangle,
    label: 'Red incorrecta',
    className: 'text-status-parked ring-status-parked/30 bg-status-parked/10',
  },
  CONNECTED_READY: {
    Icon: CheckCircle2,
    label: 'Conectado',
    className: 'text-status-pass ring-status-pass/30 bg-status-pass/10',
  },
}

interface WalletStatusPillProps {
  status: WalletStatus
  /** Optional override label (e.g. translated string from i18n) */
  label?: string
}

export function WalletStatusPill({ status, label }: WalletStatusPillProps) {
  const config = STATUS_CONFIG[status]
  const { Icon, label: defaultLabel, className } = config
  const displayLabel = label ?? defaultLabel

  return (
    // M2: font-normal (400) — EXACT shell string per UI-SPEC.
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset ${className}`}
      aria-label={displayLabel}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${status === 'CONNECTING' ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  )
}
