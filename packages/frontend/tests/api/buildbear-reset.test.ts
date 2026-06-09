// @vitest-environment node
// RED scaffold (Wave 0) — buildbear-reset route does NOT exist yet.
// Importing `@/app/api/cornerstone/buildbear-reset/route` fails to resolve, so this
// whole suite errors on import — that IS the intended RED. tsconfig-excluded until 11-02.
//
// Pins the reset route's SCOPED reason set:
//   no-snapshot | revert-failed | rpc-unreachable + { ok:true, newSnapshotId }
//   + ordering invariant (evm_revert THEN evm_snapshot)
//   + B1 (real undici fetch-failed shape → rpc-unreachable, NOT revert-failed)
//   + M1 (no RPC-URL leak in detail).

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mutable artifact holder so snapshotId presence can be toggled per-test.
const artifactHolder: { rpcUrl: string; snapshotId: string | undefined } = {
  rpcUrl: 'http://mock-rpc.test',
  snapshotId: '0x1',
}

vi.mock('@/lib/apps/abrigo/cornerstone/artifact-loader', () => ({
  deployment: {
    get rpcUrl() {
      return artifactHolder.rpcUrl
    },
    get snapshotId() {
      return artifactHolder.snapshotId
    },
    executor: '0xDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEf',
    chainId: 31337,
    mintTxHash: null,
    source: 'test',
  },
  validateDeployment: (raw: unknown) => raw,
  isExpired: vi.fn().mockReturnValue(false),
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')

// Build a JSON-RPC Response envelope.
function rpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// Read the JSON-RPC method out of a fetch call's body (nth call).
function methodOfCall(n: number): string {
  const call = fetchSpy.mock.calls[n]
  const init = call?.[1] as RequestInit | undefined
  const parsed = JSON.parse(String(init?.body ?? '{}')) as { method?: string }
  return parsed.method ?? ''
}

async function callPost() {
  const { POST } = await import('@/app/api/cornerstone/buildbear-reset/route')
  return POST(new Request('http://localhost/api/cornerstone/buildbear-reset', { method: 'POST' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  artifactHolder.snapshotId = '0x1'
})

describe('POST /api/cornerstone/buildbear-reset — scoped reason set', () => {
  it('no-snapshot: artifact snapshotId undefined → { ok:false, reason:"no-snapshot" }', async () => {
    artifactHolder.snapshotId = undefined
    const res = await callPost()
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'no-snapshot' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reset sequence: calls evm_revert(snapshotId) THEN evm_snapshot in order', async () => {
    fetchSpy
      .mockResolvedValueOnce(rpcResponse(true)) // evm_revert
      .mockResolvedValueOnce(rpcResponse('0x2')) // evm_snapshot
    await callPost()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(methodOfCall(0)).toBe('evm_revert')
    expect(methodOfCall(1)).toBe('evm_snapshot')
  })

  it('returns newSnapshotId: evm_revert→true, evm_snapshot→"0x2" → { ok:true, newSnapshotId:"0x2" }', async () => {
    fetchSpy.mockResolvedValueOnce(rpcResponse(true)).mockResolvedValueOnce(rpcResponse('0x2'))
    const res = await callPost()
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, newSnapshotId: '0x2' })
  })

  it('revert-failed: evm_revert returns false (non-true) → { ok:false, reason:"revert-failed" }, no evm_snapshot', async () => {
    fetchSpy.mockResolvedValueOnce(rpcResponse(false))
    const res = await callPost()
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, reason: 'revert-failed' })
    // evm_snapshot must NOT be called after a non-true revert
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('B1 rpc-unreachable: real undici TypeError("fetch failed")+cause.code ECONNREFUSED → { ok:false, reason:"rpc-unreachable" }', async () => {
    const e = new TypeError('fetch failed')
    ;(e as { cause?: unknown }).cause = { code: 'ECONNREFUSED' }
    fetchSpy.mockRejectedValue(e)
    const res = await callPost()
    const body = await res.json()
    // MUST classify as rpc-unreachable, NOT revert-failed (a bare Error would mis-route).
    expect(body).toMatchObject({ ok: false, reason: 'rpc-unreachable' })
  })

  it('M1 reset no rpc url leak: thrown error carries buildbear.io/SECRET123 → body leaks NEITHER', async () => {
    fetchSpy.mockRejectedValue(new Error('connect failed to https://rpc.buildbear.io/SECRET123'))
    const res = await callPost()
    const serialized = JSON.stringify(await res.json())
    expect(serialized).not.toMatch(/SECRET123/)
    expect(serialized).not.toMatch(/buildbear\.io/)
  })
})
