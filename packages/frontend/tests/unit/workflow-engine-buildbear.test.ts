// @vitest-environment node
// RED scaffold (Wave 0) — buildUpstreamFromReplayArtifact does NOT exist yet in
// workflow-engine.ts. Importing it fails to resolve, so this suite errors on import —
// that IS the intended RED. tsconfig-excluded until 11-03.
//
// MINT-03: the live mandate is sourced from the recorded replay preset (getPresetById),
// NOT from a live Somnia Agent-1 response. Uses the REAL getPresetById (no preset mock).

import { describe, expect, it } from 'vitest'

type UpstreamResult =
  | { ok: true; strategistView: { kind: string; recordedDecisionId: string } }
  | { ok: false; reason: string; strategistView: null }

async function buildUpstream(presetId: string): Promise<UpstreamResult> {
  const mod = (await import('@/lib/apps/abrigo/cornerstone/workflow-engine')) as {
    buildUpstreamFromReplayArtifact: (id: string) => UpstreamResult
  }
  return mod.buildUpstreamFromReplayArtifact(presetId)
}

describe('buildUpstreamFromReplayArtifact — MINT-03 mandate from recorded preset', () => {
  it("'infl-surprise-add' → { ok:true, strategistView } with recordedDecisionId '4083729' and kind 'StrategistDecided'", async () => {
    const result = await buildUpstream('infl-surprise-add')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.strategistView.kind).toBe('StrategistDecided')
      expect(result.strategistView.recordedDecisionId).toBe('4083729')
    }
  })

  it("'does-not-exist' → { ok:false, strategistView:null } with a reason string", async () => {
    const result = await buildUpstream('does-not-exist')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.strategistView).toBeNull()
      expect(typeof result.reason).toBe('string')
      expect(result.reason.length).toBeGreaterThan(0)
    }
  })
})
