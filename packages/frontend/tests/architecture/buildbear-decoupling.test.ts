// @vitest-environment node
// Vitest static line-order architecture test (CI-checkable) for the Somnia decoupling
// cut (MINT-02). Filename is .test.ts (NOT .spec.ts) so Vitest collects it and Playwright
// excludes it. NOT tsconfig-excluded — must compile and run green in CI now.
//
// Enforces the Phase 11 structural cut in CornerstoneClientShell.tsx:handleLiveConfirm so
// the judge live (buildbear) path can never re-introduce the v2.0 Somnia-outage coupling:
//   1. The `resolvedMode === 'buildbear'` branch appears BEFORE any `/api/abrigo/agent1`
//      reference (bare line-order).
//   2. NO-FALLTHROUGH: the buildbear branch's own `return` precedes the agent1 fetch, so a
//      branch-opens-but-never-returns bug (which the bare line-order check would miss) fails.
//   3. The buildbear branch calls `/api/cornerstone/buildbear-sign`.
//   4. ZERO `setResolvedMode('replay')` flips inside the buildbear branch (HONEST-01 — no
//      silent replay degradation on the buildbear path; Phase 12 owns the fork-used advisory).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// This file is packages/frontend/tests/architecture/, so the frontend package root is two up.
const FRONTEND_ROOT = resolve(__dirname, '../..')
const SHELL_PATH = resolve(FRONTEND_ROOT, 'components/defi/cornerstone/CornerstoneClientShell.tsx')

const code = readFileSync(SHELL_PATH, 'utf8')

describe('Somnia decoupling cut (MINT-02) — handleLiveConfirm buildbear branch', () => {
  it('contains both the buildbear branch and the agent1 fetch reference', () => {
    expect(code.indexOf("resolvedMode === 'buildbear'")).not.toBe(-1)
    expect(code.indexOf("'/api/abrigo/agent1'")).not.toBe(-1)
  })

  it('line-order: the buildbear branch precedes the /api/abrigo/agent1 fetch', () => {
    const bbIdx = code.indexOf("resolvedMode === 'buildbear'")
    const agent1Idx = code.indexOf("'/api/abrigo/agent1'")
    expect(bbIdx).toBeLessThan(agent1Idx)
  })

  it("no-fallthrough: the buildbear branch's first `return` precedes the agent1 fetch", () => {
    // A fallthrough bug (branch opens, no early return, agent1 still called) would pass the
    // bare line-order check. Locate the FIRST `return` after the buildbear branch opener and
    // assert it comes BEFORE the agent1 fetch — proving control returns before reaching Somnia.
    const bbIdx = code.indexOf("resolvedMode === 'buildbear'")
    const retIdx = code.indexOf('return', bbIdx)
    const agent1Idx = code.indexOf("'/api/abrigo/agent1'")
    expect(retIdx).toBeGreaterThan(bbIdx)
    expect(retIdx).toBeLessThan(agent1Idx)
  })

  it('the buildbear branch calls /api/cornerstone/buildbear-sign', () => {
    const bbIdx = code.indexOf("resolvedMode === 'buildbear'")
    const agent1Idx = code.indexOf("'/api/abrigo/agent1'")
    const branch = code.slice(bbIdx, agent1Idx)
    expect(branch).toContain('/api/cornerstone/buildbear-sign')
  })

  it("zero setResolvedMode('replay') flips inside the buildbear branch (HONEST-01)", () => {
    // The branch spans from its opener to its own `return` (which precedes the agent1 fetch).
    const bbIdx = code.indexOf("resolvedMode === 'buildbear'")
    const retIdx = code.indexOf('return', bbIdx)
    const branch = code.slice(bbIdx, retIdx)
    expect(branch).not.toContain("setResolvedMode('replay')")
  })

  it("preserves exactly the three live-path setResolvedMode('replay') flips (after the agent1 fetch)", () => {
    // The three live-path flips live in handleLiveConfirm AFTER the agent1 fetch: the
    // ok:false degrade, the no-wallet degrade, and the catch-block degrade. (The mount-probe
    // useEffect also has its own three replay flips earlier in the file; those are a separate,
    // pre-existing region and are not the subject of this invariant.) Slice from the agent1
    // fetch to the end of handleLiveConfirm (its closing `return (` JSX boundary) and assert
    // exactly three flips survived — none removed, none added on the buildbear path.
    const agent1Idx = code.indexOf("'/api/abrigo/agent1'")
    const jsxReturnIdx = code.indexOf('return (', agent1Idx)
    const livePath = code.slice(agent1Idx, jsxReturnIdx)
    const matches = livePath.match(/setResolvedMode\('replay'\)/g) ?? []
    expect(matches).toHaveLength(3)
  })
})
