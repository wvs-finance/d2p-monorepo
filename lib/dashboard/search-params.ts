import type { SupportedChainId } from '@/lib/apps/abrigo/instruments'
import { createLoader, parseAsStringEnum } from 'nuqs/server'
import { arbitrum, base, celo, mainnet, optimism } from 'viem/chains'

export const CHAIN_SLUGS = ['celo', 'ethereum', 'base', 'arbitrum', 'optimism'] as const
export type ChainSlug = (typeof CHAIN_SLUGS)[number]

// SINGLE source of truth for the `chain` URL parser (BA M-nuqs). ChainSelector.tsx
// MUST import and reuse `dashboardSearchParams.chain` — never re-declare parseAsStringEnum inline.
export const dashboardSearchParams = {
  chain: parseAsStringEnum<ChainSlug>(Array.from(CHAIN_SLUGS)).withDefault('celo'),
}
export const loadDashboardParams = createLoader(dashboardSearchParams)

// Derived from the viem chain objects + checked with `satisfies` (BA M-slugmap) — NOT hardcoded.
export const CHAIN_SLUG_TO_ID = {
  celo: celo.id,
  ethereum: mainnet.id,
  base: base.id,
  arbitrum: arbitrum.id,
  optimism: optimism.id,
} satisfies Record<ChainSlug, SupportedChainId>
