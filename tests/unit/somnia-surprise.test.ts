// @vitest-environment node
// Wave 0 — somnia-surprise: computeSurprise BigInt math.
// Turned GREEN by Plan 06-00 Task 1 (surprise.ts lands).
// Import is indirected so tsc --noEmit passes while the module is absent.
// Removed from tsconfig exclude in Task 1 commit (when surprise.ts lands).

import { describe, expect, it } from 'vitest'

const SURPRISE_MODULE = '@/lib/apps/abrigo/somnia/surprise'

describe('computeSurprise — BigInt-exact arithmetic', () => {
  it('computeSurprise(568n, 500n) === 68n', async () => {
    const { computeSurprise } = (await import(SURPRISE_MODULE)) as {
      computeSurprise: (macroValue: bigint, consensus: bigint) => bigint
    }
    expect(computeSurprise(568n, 500n)).toBe(68n)
  })

  it('computeSurprise(568n, 900n) === -332n', async () => {
    const { computeSurprise } = (await import(SURPRISE_MODULE)) as {
      computeSurprise: (macroValue: bigint, consensus: bigint) => bigint
    }
    expect(computeSurprise(568n, 900n)).toBe(-332n)
  })

  it('return type is bigint', async () => {
    const { computeSurprise } = (await import(SURPRISE_MODULE)) as {
      computeSurprise: (macroValue: bigint, consensus: bigint) => bigint
    }
    expect(typeof computeSurprise(568n, 500n)).toBe('bigint')
  })

  it('stays exact above Number.MAX_SAFE_INTEGER (no Number coercion)', async () => {
    const { computeSurprise } = (await import(SURPRISE_MODULE)) as {
      computeSurprise: (macroValue: bigint, consensus: bigint) => bigint
    }
    // 9007199254740993n - 1n === 9007199254740992n (would lose precision as Number)
    expect(computeSurprise(9007199254740993n, 1n)).toBe(9007199254740992n)
  })

  it('negative surplus is exact (no coercion)', async () => {
    const { computeSurprise } = (await import(SURPRISE_MODULE)) as {
      computeSurprise: (macroValue: bigint, consensus: bigint) => bigint
    }
    expect(computeSurprise(1n, 9007199254740993n)).toBe(-9007199254740992n)
  })
})
