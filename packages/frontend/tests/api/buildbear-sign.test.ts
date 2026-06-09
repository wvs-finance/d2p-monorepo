// @vitest-environment node
// RED scaffold (Wave 0) — buildbear-sign route does NOT exist yet.
// Importing `@/app/api/cornerstone/buildbear-sign/route` fails to resolve, so this
// whole suite errors on import — that IS the intended RED. tsconfig-excluded until 11-02.
//
// Pins the full discriminated reason-code contract for the sign route:
//   not-configured | fork-used | reverted | signer-gas | rpc-unreachable | ok
//   + M1 (no RPC-URL leak), M2 (body-size cap + malformed body generic detail).
//
// viem transport requires Node crypto/fetch → // @vitest-environment node.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HARDHAT_PK_0 } from '../fixtures/test-signer'

// ---------------------------------------------------------------------------
// Mocks — hoisted. Factories must not reference non-hoisted locals.
// ---------------------------------------------------------------------------

// Mock the artifact loader (no live artifact needed). rpcUrl/executor/snapshotId pinned.
vi.mock('@/lib/apps/abrigo/cornerstone/artifact-loader', () => ({
  deployment: {
    rpcUrl: 'http://mock-rpc.test',
    executor: '0xDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEf',
    snapshotId: '0x1',
    chainId: 31337,
    pool: '0xPoolAddr',
    riskManagement: '0xRiskAddr',
    mintTxHash: null,
    mintedStrike: null,
    capturedAt: new Date().toISOString(),
    source: 'test',
  },
  validateDeployment: (raw: unknown) => raw,
  isExpired: vi.fn().mockReturnValue(false),
}))

// Mock the BuildBear chain factory.
vi.mock('@/lib/apps/abrigo/cornerstone/buildbear', () => ({
  createBuildBearChain: vi.fn().mockReturnValue({ id: 31337 }),
  BuildBearChainId: 31337,
}))

// Mock env so DEMO_SIGNER_PK can be toggled per-test via the mutable holder below.
const envHolder: { DEMO_SIGNER_PK: string | undefined } = { DEMO_SIGNER_PK: HARDHAT_PK_0 }
vi.mock('@/lib/env', () => ({
  env: {
    get DEMO_SIGNER_PK() {
      return envHolder.DEMO_SIGNER_PK
    },
  },
}))

// TWO-CLIENT MOCK SPEC (M3-RC): the sign route uses BOTH a public client
// (getBalance / simulateContract / waitForTransactionReceipt) AND a wallet client
// (writeContract). Each is a vi.fn() the per-branch tests drive.
const getBalance = vi.fn()
const simulateContract = vi.fn()
const waitForTransactionReceipt = vi.fn()
const writeContract = vi.fn()

vi.mock('viem', () => ({
  http: vi.fn().mockReturnValue({}),
  createPublicClient: vi.fn().mockReturnValue({
    getBalance,
    simulateContract,
    waitForTransactionReceipt,
  }),
  createWalletClient: vi.fn().mockReturnValue({
    writeContract,
  }),
}))

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi
    .fn()
    .mockReturnValue({ address: '0x1111111111111111111111111111111111111111' }),
}))

// ---------------------------------------------------------------------------
// Throwable classes — constructed with the exact constructor.name the route's
// classifier keys off (it inspects err.constructor.name / the .cause chain).
// ---------------------------------------------------------------------------

class ContractFunctionRevertedError extends Error {
  reason: string
  constructor(reason: string) {
    super(`execution reverted: ${reason}`)
    this.reason = reason
  }
}

// viem wraps the reverted error inside an outer ContractFunctionExecutionError
// whose .cause is the ContractFunctionRevertedError. Mirror that wrapping shape.
class ContractFunctionExecutionError extends Error {
  cause: unknown
  constructor(cause: unknown) {
    super('contract function execution failed')
    this.cause = cause
  }
}

class HttpRequestError extends Error {}

// Helper: build a minimal POST Request with a small content-length header.
function makeReq(body: unknown, contentLength = '100'): Request {
  return new Request('http://localhost/api/cornerstone/buildbear-sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': contentLength },
    body: JSON.stringify(body),
  })
}

// Lazy import so the per-test env/mocks are wired before the module evaluates.
async function callPost(req: Request) {
  const { POST } = await import('@/app/api/cornerstone/buildbear-sign/route')
  return POST(req)
}

beforeEach(() => {
  vi.clearAllMocks()
  envHolder.DEMO_SIGNER_PK = HARDHAT_PK_0
})

describe('POST /api/cornerstone/buildbear-sign — reason-code contract', () => {
  it('not-configured: DEMO_SIGNER_PK unset → { ok:false, reason:"not-configured" }', async () => {
    envHolder.DEMO_SIGNER_PK = undefined
    const res = await callPost(makeReq({ mandate: {} }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'not-configured' })
  })

  it('signer-gas: getBalance returns 0n (pre-flight) → { ok:false, reason:"signer-gas" }', async () => {
    getBalance.mockResolvedValue(0n)
    const res = await callPost(makeReq({ mandate: {} }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'signer-gas' })
    // pre-flight: simulate is never reached
    expect(simulateContract).not.toHaveBeenCalled()
  })

  it('fork-used: simulate throws ContractFunctionRevertedError reason "fork used" → { ok:false, reason:"fork-used" }', async () => {
    getBalance.mockResolvedValue(1_000_000n)
    simulateContract.mockRejectedValue(
      new ContractFunctionExecutionError(new ContractFunctionRevertedError('fork used')),
    )
    const res = await callPost(makeReq({ mandate: {} }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'fork-used' })
  })

  it('reverted: simulate throws ContractFunctionRevertedError reason "SomethingElse" → { ok:false, reason:"reverted" }', async () => {
    getBalance.mockResolvedValue(1_000_000n)
    simulateContract.mockRejectedValue(
      new ContractFunctionExecutionError(new ContractFunctionRevertedError('SomethingElse')),
    )
    const res = await callPost(makeReq({ mandate: {} }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'reverted' })
  })

  it('rpc-unreachable: transport throws HttpRequestError → { ok:false, reason:"rpc-unreachable" }', async () => {
    getBalance.mockRejectedValue(new HttpRequestError('HTTP request failed'))
    const res = await callPost(makeReq({ mandate: {} }))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'rpc-unreachable' })
  })

  it('ok: simulate passes, writeContract returns hash, receipt success → { ok:true, ... null views }', async () => {
    getBalance.mockResolvedValue(1_000_000n)
    simulateContract.mockResolvedValue({ request: {} })
    writeContract.mockResolvedValue('0xhash')
    waitForTransactionReceipt.mockResolvedValue({ status: 'success', blockNumber: 1n })
    const res = await callPost(makeReq({ mandate: {} }))
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      txHash: '0xhash',
      blockNumber: 1,
      strategistView: null,
      executorView: null,
      positionMinted: null,
      margins: null,
    })
  })

  it('M1 no rpc url leak: error message carries buildbear.io/SECRET123 → body leaks NEITHER', async () => {
    getBalance.mockResolvedValue(1_000_000n)
    simulateContract.mockRejectedValue(
      new HttpRequestError('HTTP request failed: https://rpc.buildbear.io/SECRET123'),
    )
    const res = await callPost(makeReq({ mandate: {} }))
    const serialized = JSON.stringify(await res.json())
    expect(serialized).not.toMatch(/SECRET123/)
    expect(serialized).not.toMatch(/buildbear\.io/)
  })

  it('M2 body too large: content-length 99999 (>16384) → { reason:"reverted", detail:"body too large" }, no client calls', async () => {
    const res = await callPost(makeReq({ mandate: {} }, '99999'))
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'reverted', detail: 'body too large' })
    expect(getBalance).not.toHaveBeenCalled()
    expect(simulateContract).not.toHaveBeenCalled()
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('M2 malformed body: req.json() rejects → detail exactly "invalid request body" (not the raw parse error)', async () => {
    const req = new Request('http://localhost/api/cornerstone/buildbear-sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '5' },
      body: '{ bad',
    })
    const res = await callPost(req)
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'reverted', detail: 'invalid request body' })
    // generic detail — must NOT echo the raw JSON.parse error text
    expect(body.detail).toBe('invalid request body')
    expect(body.detail).not.toMatch(/JSON|token|position|Unexpected/i)
  })
})
