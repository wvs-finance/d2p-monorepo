import type { Abi, Address } from 'viem'
import type { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'

// PROVISIONAL ABI — pending the real Foundry artifact (FOUND-06 wagmi codegen).
// Three view functions inferred from DASH-03; replaced when an Abrigo contract deploys.
// Kept as a real fragment (not `[]`) so the future multicall branch typechecks today.
export const ABRIGO_ABI = [
  {
    type: 'function',
    name: 'poolBalance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'settlementCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'lpPositionCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi

export type SupportedChainId =
  | typeof celo.id
  | typeof mainnet.id
  | typeof base.id
  | typeof arbitrum.id
  | typeof optimism.id

export interface AbrigoInstrument {
  id: string
  name: string // es-CO display name
  nameEn: string // en display name
  chainId: SupportedChainId
  address: Address
  deployedAt: string // ISO date string
}

// EMPTY AT LAUNCH — no Abrigo contracts deployed on any chain yet (CONTEXT.md).
// Adding one entry here is the ONLY change needed to light up live reads.
export const ABRIGO_INSTRUMENTS: AbrigoInstrument[] = []
