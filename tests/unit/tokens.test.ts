import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const globalsPath = resolve(__dirname, '../../app/globals.css')
const css = readFileSync(globalsPath, 'utf-8')

describe('design tokens in app/globals.css', () => {
  it('contains @theme inline block', () => {
    expect(css).toMatch(/@theme\s+inline\s*\{/)
  })

  it('declares all required semantic color names', () => {
    expect(css).toMatch(/--color-bg-canvas/)
    expect(css).toMatch(/--color-bg-surface/)
    expect(css).toMatch(/--color-bg-elevated/)
    expect(css).toMatch(/--color-text-primary/)
    expect(css).toMatch(/--color-text-secondary/)
    expect(css).toMatch(/--color-text-muted/)
    expect(css).toMatch(/--color-border-default/)
    expect(css).toMatch(/--color-accent-default/)
    expect(css).toMatch(/--color-accent-hover/)
    expect(css).toMatch(/--color-status-pass/)
    expect(css).toMatch(/--color-status-fail/)
    expect(css).toMatch(/--color-status-parked/)
    expect(css).toMatch(/--color-status-in-progress/)
  })

  it('uses no pure black (#000) or pure white (#fff) literals — CROSS-05', () => {
    expect(css).not.toMatch(/#000(?![0-9a-f])/i)
    expect(css).not.toMatch(/#fff(?![0-9a-f])/i)
  })

  it('uses no raw stone-/gray-/zinc- token names — CROSS-05', () => {
    expect(css).not.toMatch(/--color-stone-/)
    expect(css).not.toMatch(/--color-gray-/)
    expect(css).not.toMatch(/--color-zinc-/)
  })

  it('all oklch chroma values are > 0 (no pure achromatic colors) — CROSS-05', () => {
    // Match all oklch() calls and verify the chroma (second param) is non-zero
    const oklchRegex = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g
    const matches = [...css.matchAll(oklchRegex)]
    for (const match of matches) {
      const chromaStr = match[2] ?? '0'
      const chroma = Number.parseFloat(chromaStr)
      expect(chroma, `oklch value at index ${match.index} has zero chroma`).toBeGreaterThan(0)
    }
    // Sanity: at least 13 token values must be present
    expect(matches.length).toBeGreaterThanOrEqual(13)
  })

  it('does not reference banned typefaces — impeccable anti-patterns', () => {
    // Use word boundaries to avoid false positives (e.g. "inline" contains "inl..." but not "Inter" as a word)
    expect(css).not.toMatch(/\bInter\b/)
    expect(css).not.toMatch(/\bGeist\b/)
    expect(css).not.toMatch(/Mona Sans/)
    expect(css).not.toMatch(/Plus Jakarta/)
  })

  it('declares both :root and .dark blocks', () => {
    expect(css).toMatch(/:root\s*\{/)
    expect(css).toMatch(/\.dark\s*\{/)
  })
})
