// @vitest-environment node
// RED stub — cornerstone presets (preset id → recordedDecisionId map + nearest-preset resolver).
// Imports from lib/apps/abrigo/cornerstone/presets (does NOT exist yet — intentional RED).
// Excluded from tsconfig until Task 2 GREEN commit.
//
// Key assertions:
//   - PRESETS has exactly 2 entries with the correct real recordedDecisionIds
//   - resolveNearestPreset(freeText) NEVER returns null/undefined
//   - PRESET-MAPPING AC (RC-M4): pinned fixture inputs → expected preset ids

import { describe, expect, it } from 'vitest'

const MODULE = '@/lib/apps/abrigo/cornerstone/presets'

type Preset = {
  id: string
  recordedDecisionId: string
}

type PresetsModule = {
  PRESETS: readonly Preset[]
  resolveNearestPreset: (text: string) => string
}

describe('PRESETS — exactly 2 entries with real recordedDecisionIds', () => {
  it('PRESETS has exactly 2 entries', async () => {
    const { PRESETS } = (await import(MODULE)) as PresetsModule
    expect(PRESETS).toHaveLength(2)
  })

  it("PRESETS[0] id is 'infl-surprise-add' → recordedDecisionId '4083729'", async () => {
    const { PRESETS } = (await import(MODULE)) as PresetsModule
    const found = PRESETS.find((p) => p.id === 'infl-surprise-add')
    expect(found).toBeDefined()
    expect(found?.recordedDecisionId).toBe('4083729')
  })

  it("PRESETS[1] id is 'infl-cooling-reduce' → recordedDecisionId '4083997'", async () => {
    const { PRESETS } = (await import(MODULE)) as PresetsModule
    const found = PRESETS.find((p) => p.id === 'infl-cooling-reduce')
    expect(found).toBeDefined()
    expect(found?.recordedDecisionId).toBe('4083997')
  })

  it('recordedDecisionIds are strings (not numbers)', async () => {
    const { PRESETS } = (await import(MODULE)) as PresetsModule
    for (const p of PRESETS) {
      expect(typeof p.recordedDecisionId).toBe('string')
    }
  })
})

describe('resolveNearestPreset — never returns null/undefined', () => {
  it('returns a string for arbitrary input', async () => {
    const { resolveNearestPreset } = (await import(MODULE)) as PresetsModule
    const result = resolveNearestPreset('some random market view text')
    expect(result).toBeDefined()
    expect(result).not.toBeNull()
    expect(typeof result).toBe('string')
  })

  it('returns one of the 2 known preset ids for any input', async () => {
    const { resolveNearestPreset, PRESETS } = (await import(MODULE)) as PresetsModule
    const knownIds = PRESETS.map((p) => p.id)
    const result = resolveNearestPreset('unknown macro view with no keywords')
    expect(knownIds).toContain(result)
  })

  it('returns a preset id for empty string (never null)', async () => {
    const { resolveNearestPreset, PRESETS } = (await import(MODULE)) as PresetsModule
    const knownIds = PRESETS.map((p) => p.id)
    const result = resolveNearestPreset('')
    expect(knownIds).toContain(result)
  })
})

describe('PRESET-MAPPING AC (RC-M4): pinned fixture inputs → expected preset ids', () => {
  it('rate-hike / inflation-surprise text → infl-surprise-add (→ 4083729)', async () => {
    const { resolveNearestPreset } = (await import(MODULE)) as PresetsModule
    // es-CO rate-hike scenario
    expect(resolveNearestPreset('la inflación sorprendió al alza, sube tasas')).toBe(
      'infl-surprise-add',
    )
    // English equivalent
    expect(resolveNearestPreset('inflation surprised to the upside, rate hike expected')).toBe(
      'infl-surprise-add',
    )
    // Simple keyword
    expect(resolveNearestPreset('alza inflación')).toBe('infl-surprise-add')
  })

  it('cooling / moderation text → infl-cooling-reduce (→ 4083997)', async () => {
    const { resolveNearestPreset } = (await import(MODULE)) as PresetsModule
    // es-CO cooling scenario
    expect(resolveNearestPreset('la inflación se modera, enfriamiento')).toBe('infl-cooling-reduce')
    // English equivalent
    expect(resolveNearestPreset('inflation is cooling down, moderation expected')).toBe(
      'infl-cooling-reduce',
    )
    // Simple keyword
    expect(resolveNearestPreset('se reduce la inflación')).toBe('infl-cooling-reduce')
  })
})
