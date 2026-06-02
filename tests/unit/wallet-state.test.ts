import { deriveWalletState } from '@/lib/wallet/state'
import type { WalletState } from '@/lib/wallet/state'
// @vitest-environment node
// DEFI-02 + DEFI-07: Pure unit tests for the 4-state wallet deriver.
// WAIVER-05-03: Non-EVM (Solana) is unreachable via EVM connectors — no 5th state built.
import { describe, expect, it } from 'vitest'

// Wave 2: READ_ONLY added to the union. deriveWalletState NEVER returns it.
// ALL_STATES is the full union set; the deriver remains a 4-output function.
const ALL_STATES: WalletState[] = [
  'DISCONNECTED',
  'CONNECTING',
  'CONNECTED_WRONG_CHAIN',
  'CONNECTED_READY',
  'READ_ONLY',
]

// The 4 states that deriveWalletState can actually return (READ_ONLY is injected, not derived)
const DERIVABLE_STATES: WalletState[] = [
  'DISCONNECTED',
  'CONNECTING',
  'CONNECTED_WRONG_CHAIN',
  'CONNECTED_READY',
]

describe('deriveWalletState — 4-state derivation', () => {
  it('{status: "connecting"} → CONNECTING', () => {
    expect(deriveWalletState({ status: 'connecting', chain: undefined })).toBe('CONNECTING')
  })

  it('{status: "reconnecting"} → CONNECTING', () => {
    expect(deriveWalletState({ status: 'reconnecting', chain: undefined })).toBe('CONNECTING')
  })

  it('{status: "disconnected"} → DISCONNECTED', () => {
    expect(deriveWalletState({ status: 'disconnected', chain: undefined })).toBe('DISCONNECTED')
  })

  it('{status: "connected", chain: undefined} → CONNECTED_WRONG_CHAIN (DEFI-07)', () => {
    expect(deriveWalletState({ status: 'connected', chain: undefined })).toBe(
      'CONNECTED_WRONG_CHAIN',
    )
  })

  it('{status: "connected", chain: {id: 42220}} → CONNECTED_READY (Celo)', () => {
    expect(deriveWalletState({ status: 'connected', chain: { id: 42220 } })).toBe('CONNECTED_READY')
  })

  it('{status: "connected", chain: {id: 1}} → CONNECTED_READY (Mainnet)', () => {
    expect(deriveWalletState({ status: 'connected', chain: { id: 1 } })).toBe('CONNECTED_READY')
  })
})

describe('deriveWalletState — exactly 4 derivable states, no 5th', () => {
  it('every return value is one of the 4 derivable literals (not READ_ONLY)', () => {
    const inputs: Parameters<typeof deriveWalletState>[0][] = [
      { status: 'connecting', chain: undefined },
      { status: 'reconnecting', chain: undefined },
      { status: 'disconnected', chain: undefined },
      { status: 'connected', chain: undefined },
      { status: 'connected', chain: { id: 42220 } },
      { status: 'connected', chain: { id: 1 } },
      { status: 'connected', chain: { id: 8453 } },
    ]
    for (const input of inputs) {
      const result = deriveWalletState(input)
      expect(DERIVABLE_STATES).toContain(result)
    }
  })

  it('exhaustive: no input combination produces an unlisted derivable state', () => {
    const statuses = ['connecting', 'reconnecting', 'disconnected', 'connected'] as const
    const chains = [undefined, { id: 42220 }, { id: 8453 }]
    for (const status of statuses) {
      for (const chain of chains) {
        const result = deriveWalletState({ status, chain })
        expect(
          DERIVABLE_STATES,
          `${status} + chain:${chain?.id} → unexpected "${result}"`,
        ).toContain(result)
      }
    }
  })

  it('deriveWalletState NEVER returns READ_ONLY for any input', () => {
    // READ_ONLY is injected by WalletPanel.readOnly — the pure deriver never returns it.
    const statuses = ['connecting', 'reconnecting', 'disconnected', 'connected'] as const
    const chains = [undefined, { id: 42220 }, { id: 8453 }, { id: 1 }]
    for (const status of statuses) {
      for (const chain of chains) {
        const result = deriveWalletState({ status, chain })
        expect(result, `${status} + chain:${chain?.id} should not be READ_ONLY`).not.toBe(
          'READ_ONLY',
        )
      }
    }
  })
})
