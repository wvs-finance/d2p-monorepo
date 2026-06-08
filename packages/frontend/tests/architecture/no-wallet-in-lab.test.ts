import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
// @vitest-environment node
// Vitest static-grep architecture test.
// Filename is .test.ts (NOT .spec.ts) so Vitest collects it and Playwright excludes it.
// Asserts that (lab) and (apps) route groups import zero wallet modules.
import { describe, expect, it } from 'vitest'

function walk(dir: string): string[] {
  const out: string[] = []
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) out.push(...walk(p))
      else if (/\.(ts|tsx)$/.test(p)) out.push(p)
    }
  } catch {
    // dir doesn't exist yet (e.g. (apps) created in Task 4) — test passes vacuously
  }
  return out
}

const BANNED = ['wagmi', '@rainbow-me/rainbowkit', 'viem', '@tanstack/react-query'] as const
const LAB_DIR = resolve(__dirname, '../../app/(lab)')
const APPS_DIR = resolve(__dirname, '../../app/(apps)')
const SHARED = [
  resolve(__dirname, '../../components/StructuredData.tsx'),
  resolve(__dirname, '../../components/LanguageSwitcher.tsx'),
]

// Helper: escape special regex characters in a module specifier
function regexEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('(lab) route group wallet isolation', () => {
  for (const banned of BANNED) {
    it(`app/(lab)/**/*.{ts,tsx} contains no '${banned}' imports`, () => {
      for (const file of walk(LAB_DIR)) {
        const src = readFileSync(file, 'utf-8')
        expect(src, `${file} imports ${banned}`).not.toMatch(
          new RegExp(`from\\s+['"]${regexEscape(banned)}['"]`),
        )
      }
      for (const file of SHARED) {
        const src = readFileSync(file, 'utf-8')
        expect(src, `${file} imports ${banned}`).not.toMatch(
          new RegExp(`from\\s+['"]${regexEscape(banned)}['"]`),
        )
      }
    })
  }
})

describe('(apps) route group wallet isolation', () => {
  for (const banned of BANNED) {
    it(`app/(apps)/**/*.{ts,tsx} contains no '${banned}' imports`, () => {
      for (const file of walk(APPS_DIR)) {
        const src = readFileSync(file, 'utf-8')
        expect(src, `${file} imports ${banned}`).not.toMatch(
          new RegExp(`from\\s+['"]${regexEscape(banned)}['"]`),
        )
      }
    })
  }
})
