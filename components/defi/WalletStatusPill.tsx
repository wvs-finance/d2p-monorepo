'use client'

// WalletStatusPill — own WalletStatus union (separate from the iteration status union — LAB-05).
// Does NOT import StatusPill.tsx, does NOT share the iteration status type.
// CROSS-09: always color + icon + text, never color alone.
// M2: font-normal (400) — per the UI-SPEC 400/600 two-weight lock.
//
// Wave 2:
// - READ_ONLY added to WalletStatus union and STATUS_CONFIG (injected by WalletPanel.readOnly).
// - useMounted guard added: SSR renders DISCONNECTED (stable); pill delays connection-derived state
//   until wagmi hydrates on the client (fixes React #418 hydration mismatch from 05.1-00).
//   Deferred fix 1 from 05.1-00 checkpoint, user-approved 2026-06-02.

import { AlertTriangle, CheckCircle2, Eye, Loader2, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

// Own union — isolated from the iteration status type (LAB-05 invariant)
export type WalletStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED_WRONG_CHAIN'
  | 'CONNECTED_READY'
  | 'READ_ONLY'

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
  // Wave 2: READ_ONLY — neutral styling; injected by WalletPanel.readOnly (never derived).
  // Full-opacity ring acceptable for neutral (text-muted on bg-surface clears WCAG 1.4.11).
  READ_ONLY: {
    Icon: Eye,
    label: 'Solo lectura',
    className: 'text-text-muted ring-border-default bg-bg-surface',
  },
}

interface WalletStatusPillProps {
  status: WalletStatus
  /** Optional override label (e.g. translated string from i18n) */
  label?: string
}

export function WalletStatusPill({ status, label }: WalletStatusPillProps) {
  // Hydration guard: SSR renders DISCONNECTED (stable); client defers to real status after mount.
  // This suppresses the CONNECTING flash during wagmi auto-reconnect that caused React #418.
  // READ_ONLY is injected from props (not wagmi-derived), so it renders correctly before mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Before mount: READ_ONLY stays as-is (it's prop-injected, not hydration-sensitive).
  // Other statuses fall back to DISCONNECTED on server to match SSR output.
  const safeStatus = mounted || status === 'READ_ONLY' ? status : 'DISCONNECTED'

  const config = STATUS_CONFIG[safeStatus]
  const { Icon, label: defaultLabel, className } = config
  const displayLabel = label ?? defaultLabel

  return (
    // M2: font-normal (400) — EXACT shell string per UI-SPEC.
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-normal ring-1 ring-inset ${className}`}
      aria-label={displayLabel}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${safeStatus === 'CONNECTING' ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  )
}
