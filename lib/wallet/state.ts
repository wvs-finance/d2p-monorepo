// Pure 4-state wallet deriver.
// Source: node_modules/wagmi/dist/types/hooks/useAccount.d.ts (status + chain verified).
// WAIVER-05-03: Non-EVM (Solana) is unreachable via EVM connectors — no 5th state built.
//
// Wave 2: READ_ONLY added to the union.
// READ_ONLY is injected by WalletPanel when readOnly=true; the pure deriver never returns it.
// deriveWalletState remains a 4-output function — its body is NOT modified.

export type WalletState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED_WRONG_CHAIN'
  | 'CONNECTED_READY'
  | 'READ_ONLY'

export function deriveWalletState(input: {
  status: 'connecting' | 'reconnecting' | 'connected' | 'disconnected'
  chain: { id: number } | undefined
}): WalletState {
  if (input.status === 'connecting' || input.status === 'reconnecting') return 'CONNECTING'
  if (input.status === 'disconnected') return 'DISCONNECTED'
  if (input.chain === undefined) return 'CONNECTED_WRONG_CHAIN'
  return 'CONNECTED_READY'
}
