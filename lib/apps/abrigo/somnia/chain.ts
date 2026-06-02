// Somnia testnet chain + client — SEPARATE from the 5-chain wagmi config.
// SomniaChainId is NOT added to SupportedChainId union in instruments.ts.
// somniaClient is NOT added to publicClients in wagmi/config.ts.
// Keeping Somnia fully isolated prevents unintended RPC calls from the main app.

import { http, createPublicClient } from 'viem'
import { defineChain } from 'viem'

export const SomniaChainId = 50312 as const

export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://api.infra.testnet.somnia.network'],
    },
  },
})

export const somniaClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
})
