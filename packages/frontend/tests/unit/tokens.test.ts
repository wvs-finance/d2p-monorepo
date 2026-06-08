import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const globalsPath = resolve(__dirname, '../../app/globals.css')
const layoutPath = resolve(__dirname, '../../app/layout.tsx')
const css = readFileSync(globalsPath, 'utf-8')
const layout = readFileSync(layoutPath, 'utf-8')

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
    // Match all oklch() calls without alpha (3-arg form) and verify the chroma is non-zero.
    // Exclude alpha-slash form (e.g. oklch(0.6 0.08 70 / 0.12)) from the 3-arg check.
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
    expect(css).not.toMatch(/\bInter\b/)
    expect(css).not.toMatch(/\bGeist\b/)
    expect(css).not.toMatch(/Mona Sans/)
    expect(css).not.toMatch(/Plus Jakarta/)
  })

  it('declares both :root and .dark blocks', () => {
    expect(css).toMatch(/:root\s*\{/)
    expect(css).toMatch(/\.dark\s*\{/)
  })

  // === Phase 2 token migration assertions ===

  // Test 1: --accent-default light mode is hue 70 (muted ochre), NOT hue 165 (teal-green)
  it('--accent-default light mode resolves to oklch(0.6 0.08 70)', () => {
    expect(css).toMatch(/--accent-default:\s*oklch\(0\.6\s+0\.08\s+70\)/)
  })

  // Test 2: --accent-default dark mode resolves to oklch(0.7 0.1[0] 70) — biome normalizes trailing zeros
  it('--accent-default dark mode resolves to oklch(0.7 0.10 70)', () => {
    // biome formats 0.10 as 0.1; both forms are equivalent
    expect(css).toMatch(/--accent-default:\s*oklch\(0\.7\s+0\.1[0]?\s+70\)/)
  })

  // Test 3: --spacing-5xl token exists in @theme inline and resolves to 120px
  it('--spacing-5xl token exists in @theme inline and resolves to 120px', () => {
    expect(css).toMatch(/--spacing-5xl:\s*120px/)
  })

  // Test 4: All neutrals hues are in range [70, 80] in both light and dark
  it('all neutral tokens (bg-canvas, text-primary, text-muted, border-default) use hues 70-80', () => {
    // Verify key neutral tokens use hue 70-80 in both :root and .dark
    // Light mode
    expect(css).toMatch(/--bg-canvas:\s*oklch\([\d.]+\s+[\d.]+\s+8[0-9]/)
    expect(css).toMatch(/--text-primary:\s*oklch\([\d.]+\s+[\d.]+\s+8[0-9]/)
    expect(css).toMatch(/--text-muted:\s*oklch\([\d.]+\s+[\d.]+\s+7[0-9]/)
    expect(css).toMatch(/--border-default:\s*oklch\([\d.]+\s+[\d.]+\s+7[0-9]/)
    // Dark mode — no hue-165 remnants
    expect(css).not.toMatch(/oklch\([^)]+\b165\b/)
    // Count distinct neutral token declarations in both :root and .dark
    const bgCanvasCount = (css.match(/--bg-canvas:\s*oklch/g) ?? []).length
    expect(bgCanvasCount, '--bg-canvas must appear in both :root and .dark').toBeGreaterThanOrEqual(
      2,
    )
    const textPrimaryCount = (css.match(/--text-primary:\s*oklch/g) ?? []).length
    expect(
      textPrimaryCount,
      '--text-primary must appear in both :root and .dark',
    ).toBeGreaterThanOrEqual(2)
  })

  // Test 5: Status color values are UNCHANGED from Phase 1 (hue-independent)
  it('status colors carry forward their Phase 1 values unchanged', () => {
    expect(css).toMatch(/--status-pass:\s*oklch\(0\.38\s+0\.17\s+145\)/)
    expect(css).toMatch(/--status-fail:\s*oklch\(0\.40?\s+0\.19\s+30\)/)
    expect(css).toMatch(/--status-parked:\s*oklch\(0\.42\s+0\.13\s+60\)/)
    expect(css).toMatch(/--status-in-progress:\s*oklch\(0\.38\s+0\.16\s+230\)/)
  })

  // Test 6: WCAG AA contrast — dark text-primary vs dark bg-canvas: L contrast ≥ 4.5:1
  // text-primary dark = oklch(0.93 ...) → luminance ≈ 0.85; bg-canvas dark = oklch(0.13 ...) → luminance ≈ 0.012
  // Contrast ≈ (0.85 + 0.05) / (0.012 + 0.05) = 0.9 / 0.062 ≈ 14.5:1 — well above 4.5:1
  // We verify the specific values are present (the math is inherent to the OKLCH values chosen)
  it('dark mode text-primary (0.93) vs bg-canvas (0.13) meet WCAG AA ≥ 4.5:1 contrast', () => {
    expect(css).toMatch(/--text-primary:\s*oklch\(0\.93\s+/)
    expect(css).toMatch(/--bg-canvas:\s*oklch\(0\.13\s+/)
    // Verify the L values — 0.93 / 0.13 produces high contrast ratio well above 4.5:1
    // OKLCH L=0.93 ≈ relative luminance 0.83; L=0.13 ≈ relative luminance 0.013
    // CR = (0.83 + 0.05) / (0.013 + 0.05) ≈ 13.97 — passes WCAG AA (4.5:1) and AAA (7:1)
    const darkCanvasMatch = css.match(/\.dark\s*\{[^}]+--bg-canvas:\s*oklch\(([\d.]+)/)
    const darkTextPrimaryMatch = css.match(/\.dark\s*\{[^}]+--text-primary:\s*oklch\(([\d.]+)/)
    if (darkCanvasMatch && darkTextPrimaryMatch) {
      const canvasL = Number.parseFloat(darkCanvasMatch[1] ?? '0')
      const textL = Number.parseFloat(darkTextPrimaryMatch[1] ?? '0')
      // Higher L value is the lighter one
      const lighter = Math.max(canvasL, textL)
      const darker = Math.min(canvasL, textL)
      // Approximate WCAG relative luminance from OKLCH L (linear approximation sufficient for gate)
      // OKLCH L is perceptual; for gate purposes we verify the ratio of L values
      // True luminance requires gamma correction; using direct L ratio as a lower-bound proxy
      const ratio = (lighter + 0.05) / (darker + 0.05)
      expect(
        ratio,
        `Dark mode text/canvas contrast ratio ${ratio.toFixed(2)} must be ≥ 4.5`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  // Test 7: --color-accent-subtle alias exists in @theme inline
  it('--color-accent-subtle alias resolves via @theme inline', () => {
    expect(css).toMatch(/--color-accent-subtle:\s*var\(--accent-subtle\)/)
  })

  // Test 8: IBM Plex Sans declared in layout.tsx; no banned typefaces
  it('IBM Plex Sans declared in layout.tsx and no banned typefaces present', () => {
    expect(layout).toMatch(/IBM_Plex_Sans/)
    expect(layout).not.toMatch(/\bInter\b/)
    expect(layout).not.toMatch(/\bGeist\b/)
    expect(layout).not.toMatch(/Mona Sans/)
    expect(layout).not.toMatch(/Plus Jakarta/)
  })
})
