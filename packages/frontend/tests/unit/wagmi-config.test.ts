import { beforeAll, describe, expect, it } from 'vitest'

// Set SKIP_ENV_VALIDATION before importing the config module.
// The wagmi config reads env vars via @t3-oss/env-nextjs at module load time.
// Without real RPC URLs in the test environment we skip validation and
// exercise only the structural / config assertions (chain list, transport shape).
beforeAll(() => {
  process.env.SKIP_ENV_VALIDATION = 'true'
  // Provide stub RPC URLs so the fallback transports are constructed correctly.
  process.env.NEXT_PUBLIC_RPC_CELO_PRIMARY = 'https://forno.celo.org'
  process.env.NEXT_PUBLIC_RPC_ETH_PRIMARY = 'https://ethereum.publicnode.com'
  process.env.NEXT_PUBLIC_RPC_BASE_PRIMARY = 'https://mainnet.base.org'
  process.env.NEXT_PUBLIC_RPC_ARB_PRIMARY = 'https://arb1.arbitrum.io/rpc'
  process.env.NEXT_PUBLIC_RPC_OP_PRIMARY = 'https://mainnet.optimism.io'
  process.env.NEXT_PUBLIC_WALLETCONNECT_ID = 'test-walletconnect-id'
})

describe('lib/wagmi/config', () => {
  it('exports chains array with exactly 6 elements (5 mainnet + BuildBear fork 31337)', async () => {
    const { chains } = await import('@/lib/wagmi/config')
    expect(chains).toHaveLength(6)
  })

  it('chain IDs match expected networks', async () => {
    const { chains } = await import('@/lib/wagmi/config')
    const ids = chains.map((c) => c.id)
    expect(ids).toContain(42220) // celo
    expect(ids).toContain(1) // mainnet
    expect(ids).toContain(8453) // base
    expect(ids).toContain(42161) // arbitrum
    expect(ids).toContain(10) // optimism
    expect(ids).toContain(31337) // BuildBear Polygon fork (09-03 D2: 6th chain for live mint)
  })

  it('wagmiConfig.chains[0] is celo (primary chain)', async () => {
    const { wagmiConfig } = await import('@/lib/wagmi/config')
    expect(wagmiConfig.chains[0].id).toBe(42220)
  })

  it('wagmiConfig has fallback transports for all 6 chains', async () => {
    const { wagmiConfig, chains } = await import('@/lib/wagmi/config')
    // Each chain must have a transport configured in the transports map.
    for (const chain of chains) {
      const transport = wagmiConfig._internal.transports[chain.id]
      // The transport should exist (not undefined) for every chain.
      expect(transport).toBeDefined()
    }
  })

  it('wagmiConfig has ssr: false (wallet state is client-only)', async () => {
    const { wagmiConfig } = await import('@/lib/wagmi/config')
    // wagmi v2 createConfig returns the ssr setting on the config object.
    expect(wagmiConfig._internal.ssr).toBe(false)
  })
})
