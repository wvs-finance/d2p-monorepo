'use client'

import { ClipboardCopy } from 'lucide-react'
import { useState } from 'react'

export interface ReplicationHashProps {
  hash: string
  /** Translated "Copy replication hash" label for the button aria-label */
  copyLabel: string
  /** Translated "Copied!" label for the transient tooltip */
  copiedLabel: string
}

export function ReplicationHash({ hash, copyLabel, copiedLabel }: ReplicationHashProps) {
  const [copied, setCopied] = useState(false)

  const displayHash = hash.length >= 16 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Silently swallow clipboard errors — do not crash UI
    }
  }

  return (
    <span
      className="inline-flex items-center gap-2 font-mono text-xs text-text-secondary hover:border-accent-default/50 focus-within:ring-2 focus-within:ring-accent-default rounded"
      title={hash}
      aria-label={`Replication hash: ${hash}`}
    >
      <span>{displayHash}</span>
      <span className="relative">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copyLabel}
          className="inline-flex items-center text-text-muted hover:text-accent-default active:text-accent-default transition-colors"
        >
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {copied && (
          <output className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-primary shadow-sm">
            {copiedLabel}
          </output>
        )}
      </span>
    </span>
  )
}
