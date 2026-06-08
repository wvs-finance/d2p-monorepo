'use client'

// AgentCostPlaceholder — Surface 5.
// Static, always-visible capability disclosure.
// No numbers, no on-chain read, no fake values, no skeleton.
// Dashed border signals "not active/deployed".
//
// HONESTY INVARIANTS (spec §5.3):
//   - No totalCost call. No address. No numeric values.
//   - OperationalCostManagement rendered in IBM Plex Mono (inline mono text).
//   - Both es-CO and en body copy always visible.
//   - aria-label on container.

import { CircleDashed } from 'lucide-react'

export interface AgentCostPlaceholderStrings {
  heading: string
  bodyEs: string
  bodyEn: string
  contractName: string
  ariaLabel: string
}

interface AgentCostPlaceholderProps {
  strings: AgentCostPlaceholderStrings
}

export function AgentCostPlaceholder({ strings }: AgentCostPlaceholderProps) {
  return (
    <aside
      className="rounded border border-dashed border-border-default bg-bg-surface p-4 space-y-2"
      aria-label={strings.ariaLabel}
    >
      {/* Heading row */}
      <div className="flex items-center gap-2">
        <CircleDashed className="h-5 w-5 text-text-muted shrink-0" aria-hidden="true" />
        <h3 className="text-base font-semibold text-text-muted">{strings.heading}</h3>
      </div>

      {/* es-CO body */}
      <p className="text-sm text-text-muted">
        {/* Render the body copy, substituting the contract name with mono */}
        {renderBodyWithContractName(strings.bodyEs, strings.contractName)}
      </p>

      {/* en body */}
      <p className="text-sm text-text-muted">{strings.bodyEn}</p>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// renderBodyWithContractName — replaces the contract name placeholder in the copy
// with a <code> span using IBM Plex Mono (the OperationalCostManagement token).
// ---------------------------------------------------------------------------

function renderBodyWithContractName(body: string, contractName: string): React.ReactNode {
  const parts = body.split(contractName)
  if (parts.length === 1) {
    // contractName not found in body — render as-is
    return body
  }
  return (
    <>
      {parts[0]}
      <code className="font-mono text-[13px]">{contractName}</code>
      {parts[1]}
    </>
  )
}
