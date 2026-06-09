// tests/unit/cornerstone/artifact-null-roundtrip.test.ts
//
// PROV-04 validation (Phase 10): the --no-mint artifact shape — mintTxHash: null,
// mintedStrike: null, snapshotId present — MUST round-trip through the REAL exported
// validateDeployment without throwing. This replaces the un-installed `tsx` invocation
// (tsx/ts-node are not installed; vitest ^4.1.6 IS) with a vitest unit test that feeds
// the exact --no-mint fixture through the validator the loader uses at module load.

import { validateDeployment } from '@/lib/apps/abrigo/cornerstone/artifact-loader'
import { describe, expect, it } from 'vitest'

describe('artifact-loader: --no-mint null-fixture round-trip (PROV-04)', () => {
  const fixture = {
    chainId: 31337,
    executor: '0x0000000000000000000000000000000000000001',
    pool: '0x0000000000000000000000000000000000000002',
    riskManagement: '0x0000000000000000000000000000000000000003',
    rpcUrl: 'https://example.invalid',
    mintTxHash: null,
    mintedStrike: null,
    capturedAt: '2026-06-08T00:00:00.000Z',
    snapshotId: '0x1',
    source: 'test',
  }

  it('validateDeployment does NOT throw on a mintTxHash:null + snapshotId fixture', () => {
    expect(() => validateDeployment(fixture)).not.toThrow()
  })

  it('validateDeployment returns the artifact with mintTxHash === null', () => {
    expect(validateDeployment(fixture).mintTxHash).toBeNull()
  })

  it('validateDeployment preserves the snapshotId field', () => {
    expect(validateDeployment(fixture).snapshotId).toBe('0x1')
  })

  it('validateDeployment preserves mintedStrike === null', () => {
    expect(validateDeployment(fixture).mintedStrike).toBeNull()
  })
})
