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

// ---------------------------------------------------------------------------
// Discriminated union — kind: 'live' | 'simulated'
// ---------------------------------------------------------------------------

/** A live (deployed) instrument. All on-chain fields are present. */
export type LiveInstrument = {
  kind: 'live'
  id: string
  name: string // es-CO display name
  nameEn: string // en display name
  chainId: SupportedChainId
  address: Address
  deployedAt: string // ISO date string
  // Phase 5: static registry fields — provisional pending Foundry artifact strike/slope getters
  strike: number // strike price in the instrument's denomination
  slope: number // payoff slope coefficient (delta at strike)
}

/** A simulated (fork-fixture, not deployed) instrument. No on-chain fields. */
export type SimulatedInstrument = {
  kind: 'simulated'
  id: string
  name: string // es-CO display name
  nameEn: string // en display name
  chainId: SupportedChainId
  /** Key into FIXTURES (lib/apps/abrigo/fixture.ts) for fork-fixture data. */
  fixtureKey: string
}

/** Discriminated union — narrow on `instrument.kind` before reading live-only fields. */
export type AbrigoInstrument = LiveInstrument | SimulatedInstrument

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

// Adding a LiveInstrument entry here is the ONLY change needed to light up live reads.
export const ABRIGO_INSTRUMENTS: AbrigoInstrument[] = [
  {
    kind: 'simulated',
    id: 'ccop-usd-long-gamma',
    name: 'Cobertura larga gamma cCOP/USD',
    nameEn: 'cCOP/USD Long-Gamma Hedge',
    chainId: 8453,
    fixtureKey: 'ccop-usd-long-gamma',
  },
]
