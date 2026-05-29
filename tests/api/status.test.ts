// @vitest-environment node
// This test will import the GET route which imports viem — requires node environment.

import { GET } from '@/app/api/status/route'
import type { SupportedChainId } from '@/lib/apps/abrigo/instruments'
import type { PublicClient } from 'viem'
import { celo } from 'viem/chains'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the shared publicClients so tests never hit real RPCs.
// lib/status/health.ts uses publicClients[chainId].getBlockNumber() directly.
// NOTE: vi.mock is hoisted — factory must NOT reference non-hoisted variables.
// Use literal chain IDs (celo=42220, mainnet=1, base=8453, arbitrum=42161, optimism=10).
vi.mock('@/lib/chains/clients', () => {
  const makeHealthy = () => ({ getBlockNumber: vi.fn().mockResolvedValue(BigInt(1_000_000)) })
  return {
    publicClients: {
      42220: makeHealthy(), // celo
      1: makeHealthy(), // mainnet
      8453: makeHealthy(), // base
      42161: makeHealthy(), // arbitrum
      10: makeHealthy(), // optimism
    } as unknown as Record<SupportedChainId, PublicClient>,
  }
})

describe('GET /api/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with version:1 + status/build/timestamp/chains[5]/apps', async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.version).toBe(1)
    expect(typeof body.status).toBe('string')
    expect(typeof body.build).toBe('string')
    expect(typeof body.timestamp).toBe('string')
    expect(Array.isArray(body.chains)).toBe(true)
    expect(body.chains).toHaveLength(5)
    expect(body.apps).toBeDefined()
    expect(body.apps.abrigo).toBeDefined()
    // Every chain should be healthy when all probes succeed
    expect(body.status).toBe('ok')
    // Must not throw on JSON serialization (no bigints, no circular refs)
    expect(() => JSON.stringify(body)).not.toThrow()
  })

  it('isolates one failing RPC probe — response still resolves degraded, no throw', async () => {
    // Re-import the clients mock and make celo chain reject
    const { publicClients } = await import('@/lib/chains/clients')
    const celoClient = publicClients[celo.id]
    vi.spyOn(celoClient, 'getBlockNumber').mockRejectedValueOnce(new Error('RPC unreachable'))

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    // Overall status must be degraded because one chain is degraded
    expect(body.status).toBe('degraded')
    // All 5 chains still present
    expect(body.chains).toHaveLength(5)
    // The failing chain (celo) shows degraded
    const celoEntry = body.chains.find(
      (c: { chainId: number; status: string }) => c.chainId === celo.id,
    )
    expect(celoEntry).toBeDefined()
    expect(celoEntry?.status).toBe('degraded')
    // The other 4 chains remain healthy
    const otherChains = body.chains.filter(
      (c: { chainId: number; status: string }) => c.chainId !== celo.id,
    )
    expect(otherChains.every((c: { status: string }) => c.status === 'healthy')).toBe(true)
    // No throw
    expect(() => JSON.stringify(body)).not.toThrow()
  })
})
