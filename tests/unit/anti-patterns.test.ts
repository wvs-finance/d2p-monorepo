import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// In CI, the dedicated `impeccable` GitHub Actions job runs `npx impeccable detect app/`
// directly and is the canonical anti-pattern gate. These tests duplicate that as a local
// planted-fixture proof; they are skipped in CI to avoid double-running impeccable (slow)
// and to avoid environment-specific execSync stdout-capture differences on GitHub runners.
const SKIP_IN_CI = process.env.CI === 'true'

// Vitest test — NOT Playwright. Shells out to the impeccable CLI to prove the
// detector actually fires on planted anti-pattern fixtures. The CI workflow job
// `impeccable` runs `npx --yes impeccable detect app/` and relies on the same
// non-zero exit code behavior verified here.
//
// impeccable version verified: 2.1.8 (see docs/impeccable-flag.md)
// No --fail-on-error flag exists; the binary exits non-zero (code 2) when
// violations are detected in non-JSON mode.
//
// Fixture: tests/unit/fixtures/anti-patterns.html
// Contains deliberate violations of: overused-font (Inter), ai-color-palette
// (purple gradient), pure-black-white (#000000 background), gradient-text,
// dark-glow, gray-on-color (low-contrast), side-tab accent border.

function runImpeccable(path: string): { stdout: string; exitCode: number } {
  let stdout = ''
  let exitCode = 0
  try {
    stdout = execSync(`npx impeccable detect "${path}"`, {
      encoding: 'utf8',
      cwd: '/home/jmsbpp/apps/d2p/frontend',
    })
  } catch (err: unknown) {
    const e = err as {
      stdout?: string
      stderr?: string
      status?: number
    }
    stdout = (e.stdout ?? '') + (e.stderr ?? '')
    exitCode = e.status ?? 1
  }
  return { stdout, exitCode }
}

// 30s per test: `npx impeccable` may resolve, download, and scan; the default
// 5s timeout is too tight even on warm caches.
const IMPECCABLE_TIMEOUT_MS = 30_000

describe.skipIf(SKIP_IN_CI)('impeccable anti-pattern detector', () => {
  it(
    'detects each planted anti-pattern in fixtures (non-zero exit)',
    () => {
      const { exitCode } = runImpeccable('tests/unit/fixtures/anti-patterns.html')

      // Primary signal: non-zero exit is the strategy the CI workflow relies on.
      expect(exitCode).not.toBe(0)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects overused font (Inter) in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/inter|overused.font/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects AI color palette (purple gradient) in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/purple|violet|ai.color.palette/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects pure black background in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/pure.black|#000000/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects gradient text in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/gradient.text|background.clip/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects dark glow in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/dark.glow|glow|box.shadow/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects gray text on colored background (low contrast) in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/low.contrast|contrast|#6b7280/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'detects side-tab accent border in fixtures',
    () => {
      const { stdout } = runImpeccable('tests/unit/fixtures/anti-patterns.html')
      expect(stdout).toMatch(/side.tab|border.left/i)
    },
    IMPECCABLE_TIMEOUT_MS,
  )

  it(
    'clean app/ source returns exit code 0',
    () => {
      const { exitCode } = runImpeccable('app/')
      expect(exitCode).toBe(0)
    },
    IMPECCABLE_TIMEOUT_MS,
  )
})
