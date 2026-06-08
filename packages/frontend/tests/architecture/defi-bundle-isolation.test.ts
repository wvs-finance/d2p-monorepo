import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
// @vitest-environment node
// FOUND-11: Wallet-isolation guard for (lab) AND (apps) route groups.
// Complements no-wallet-in-lab.test.ts — adds app/(apps) to the scan set.
// app/(defi) is ALLOWED to import wallet modules — this test does NOT ban it.
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
    // dir doesn't exist yet — test passes vacuously
  }
  return out
}

// Helper: escape special regex characters in a module specifier
function regexEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const BANNED = ['wagmi', '@rainbow-me/rainbowkit', 'viem', '@tanstack/react-query'] as const
const LAB_DIR = resolve(__dirname, '../../app/(lab)')
const APPS_DIR = resolve(__dirname, '../../app/(apps)')

describe('(lab) route group — defi wallet isolation (FOUND-11)', () => {
  for (const banned of BANNED) {
    it(`app/(lab)/**/*.{ts,tsx} contains no '${banned}' imports`, () => {
      for (const file of walk(LAB_DIR)) {
        const src = readFileSync(file, 'utf-8')
        expect(src, `${file} imports ${banned}`).not.toMatch(
          new RegExp(`from\\s+['"]${regexEscape(banned)}['"]`),
        )
      }
    })
  }
})

describe('(apps) route group — defi wallet isolation (FOUND-11)', () => {
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

// NOTE: app/(defi) is INTENTIONALLY omitted from this test — it is ALLOWED to import
// wagmi, @rainbow-me/rainbowkit, viem, and @tanstack/react-query. The WagmiProvider
// lives in app/(defi)/providers.tsx and the WalletPanel client component uses these libs.
