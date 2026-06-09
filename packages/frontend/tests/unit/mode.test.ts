// @vitest-environment node
// Unit test for parseMode — Phase 11 extends the CornerstoneMode union with 'buildbear'.
//
// Pure function, no viem — node env is fine (and avoids jsdom overhead).
//
// Contract pinned here:
//   - parseMode('buildbear') === 'buildbear'  (NEW in Phase 11)
//   - parseMode('live')      === 'live'
//   - parseMode('mock')      === 'mock'
//   - parseMode(null/undefined/garbage) === 'replay'  (DEFAULT_MODE unchanged — zero-secret default)

import { type CornerstoneMode, DEFAULT_MODE, parseMode } from '@/lib/apps/abrigo/cornerstone/mode'
import { describe, expect, it } from 'vitest'

describe('parseMode — Phase 11 buildbear extension', () => {
  it("parseMode('buildbear') returns 'buildbear'", () => {
    expect(parseMode('buildbear')).toBe('buildbear')
  })

  it("parseMode('live') returns 'live'", () => {
    expect(parseMode('live')).toBe('live')
  })

  it("parseMode('mock') returns 'mock'", () => {
    expect(parseMode('mock')).toBe('mock')
  })

  it("parseMode(null) returns 'replay' (default unchanged)", () => {
    expect(parseMode(null)).toBe('replay')
    expect(parseMode(null)).toBe(DEFAULT_MODE)
  })

  it("parseMode(undefined) returns 'replay' (default unchanged)", () => {
    expect(parseMode(undefined)).toBe('replay')
  })

  it("parseMode('garbage') returns 'replay' (default unchanged)", () => {
    expect(parseMode('garbage')).toBe('replay')
  })

  it("DEFAULT_MODE stays 'replay' — zero-secret default is preserved", () => {
    expect(DEFAULT_MODE).toBe('replay')
  })

  it("'buildbear' is assignable to CornerstoneMode (type-level)", () => {
    const m: CornerstoneMode = 'buildbear'
    expect(m).toBe('buildbear')
  })
})
