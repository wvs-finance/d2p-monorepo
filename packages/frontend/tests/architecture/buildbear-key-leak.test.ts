// @vitest-environment node
// Vitest static-grep architecture test (CI-checkable, GREEN now — before any route exists).
// Filename is .test.ts (NOT .spec.ts) so Vitest collects it and Playwright excludes it.
// NOT tsconfig-excluded — must compile and run green in CI now.
//
// Enforces the Phase 11 server-only-key contract so the Wave-1 buildbear-sign route stays honest:
//   1. No file under packages/frontend contains 'NEXT_PUBLIC_DEMO_SIGNER' (zero key leak).
//   2. Every DEMO_SIGNER_PK reference is under app/api/ OR lib/env.ts OR a tests/ file.
//   3. Every privateKeyToAccount reference is under app/api/ (the only legitimate signing sites).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// Repo-root-relative: this file is packages/frontend/tests/architecture/, so the
// frontend package root is two levels up.
const FRONTEND_ROOT = resolve(__dirname, '../..')
const SCAN_DIRS = ['app', 'components', 'lib'].map((d) => resolve(FRONTEND_ROOT, d))
const TESTS_DIR = resolve(FRONTEND_ROOT, 'tests')

function walk(dir: string): string[] {
  const out: string[] = []
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) out.push(...walk(p))
      else if (/\.(ts|tsx)$/.test(p)) out.push(p)
    }
  } catch {
    // dir absent → no files to scan (vacuous pass)
  }
  return out
}

// Normalize to forward-slash relative path for stable matching across OSes.
function rel(file: string): string {
  return file
    .slice(FRONTEND_ROOT.length + 1)
    .split(sep)
    .join('/')
}

// This arch test itself names the banned tokens (as regex patterns / messages) — exclude
// it from its own scan so it doesn't self-match. Same for tests/ in rule 1 (the buildbear
// route-test scaffolds legitimately reference DEMO_SIGNER_PK / the key via the fixture).
const SELF = resolve(__dirname, 'buildbear-key-leak.test.ts')
const SCANNED = SCAN_DIRS.flatMap(walk)
const TEST_FILES = walk(TESTS_DIR).filter((f) => f !== SELF)

// Real CODE read of the env var (assignment/property access), not a documentation comment
// mentioning the name. lib/env.ts (schema declaration) is handled by the explicit allow-list.
const DEMO_SIGNER_READ = /\benv\.DEMO_SIGNER_PK\b|\bprocess\.env\.DEMO_SIGNER_PK\b/
const PRIVATE_KEY_CALL = /\bprivateKeyToAccount\s*\(/

describe('buildbear key-leak architecture invariants', () => {
  it('no file under packages/frontend references NEXT_PUBLIC_DEMO_SIGNER', () => {
    for (const file of [...SCANNED, ...TEST_FILES]) {
      const src = readFileSync(file, 'utf-8')
      expect(src, `${rel(file)} references NEXT_PUBLIC_DEMO_SIGNER (key leak)`).not.toMatch(
        /NEXT_PUBLIC_DEMO_SIGNER/,
      )
    }
  })

  it('DEMO_SIGNER_PK is only READ under app/api/ (lib/env.ts declares the schema)', () => {
    for (const file of SCANNED) {
      const src = readFileSync(file, 'utf-8')
      const r = rel(file)
      if (r === 'lib/env.ts') continue // schema declaration site — allowed
      if (!DEMO_SIGNER_READ.test(src)) continue
      expect(r.startsWith('app/api/'), `${r} reads DEMO_SIGNER_PK outside app/api/`).toBe(true)
    }
  })

  it('privateKeyToAccount is only CALLED under app/api/', () => {
    for (const file of SCANNED) {
      const src = readFileSync(file, 'utf-8')
      if (!PRIVATE_KEY_CALL.test(src)) continue
      const r = rel(file)
      expect(r.startsWith('app/api/'), `${r} calls privateKeyToAccount outside app/api/`).toBe(true)
    }
  })
})
