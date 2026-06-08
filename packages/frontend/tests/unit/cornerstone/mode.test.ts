// tests/unit/cornerstone/mode.test.ts
//
// Tests for CornerstoneMode type + DEFAULT_MODE + parseMode helper.
// GOVERNANCE: DEFAULT_MODE MUST be 'replay' — the frozen guaranteed artifact.

import { DEFAULT_MODE, parseMode } from '@/lib/apps/abrigo/cornerstone/mode'
import { describe, expect, it } from 'vitest'

describe('CornerstoneMode governance', () => {
  it('DEFAULT_MODE is replay (the frozen guaranteed artifact)', () => {
    expect(DEFAULT_MODE).toBe('replay')
  })

  it('parseMode("live") returns live', () => {
    expect(parseMode('live')).toBe('live')
  })

  it('parseMode("mock") returns mock', () => {
    expect(parseMode('mock')).toBe('mock')
  })

  it('parseMode("replay") returns replay', () => {
    expect(parseMode('replay')).toBe('replay')
  })

  it('parseMode with garbage returns replay (DEFAULT_MODE)', () => {
    expect(parseMode('garbage')).toBe('replay')
    expect(parseMode('LIVE')).toBe('replay')
    expect(parseMode('Mock')).toBe('replay')
    expect(parseMode('')).toBe('replay')
    expect(parseMode('undefined')).toBe('replay')
  })

  it('parseMode(null) returns replay (DEFAULT_MODE)', () => {
    expect(parseMode(null)).toBe('replay')
  })

  it('parseMode(undefined) returns replay (DEFAULT_MODE)', () => {
    expect(parseMode(undefined)).toBe('replay')
  })
})
