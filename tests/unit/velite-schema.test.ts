// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { iterationSchema } from '../../velite.config'

// Minimal valid PASS iteration — all required fields present, sha256-shaped hash.
const VALID_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

const validBase = {
  slug: 'sample',
  version: 1,
  status: 'PASS' as const,
  title_es: 'Iteración de muestra',
  title_en: 'Sample iteration',
  notebook_url: 'https://github.com/wvs-finance/abrigo/blob/main/notebooks/sample.ipynb',
  dataset_ref: 'wvs-finance/sample-panel:v0',
  analysis_date: '2026-05-11',
  replication_hash: VALID_HASH,
}

describe('velite iteration schema', () => {
  // Test 1: valid PASS object passes
  it('accepts a valid PASS iteration with all required fields', () => {
    const result = iterationSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  // Test 2: FAIL without disposition_memo fails (.refine)
  it('rejects FAIL status without disposition_memo', () => {
    const data = { ...validBase, status: 'FAIL' as const }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('disposition_memo')
    }
  })

  // Test 3: FAIL WITH disposition_memo passes
  it('accepts FAIL status when disposition_memo is provided', () => {
    const data = {
      ...validBase,
      status: 'FAIL' as const,
      disposition_memo: 'Heteroskedasticity invalidated CIs; see notebook cell 14.',
    }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  // Test 4: replication_hash too short fails
  it('rejects replication_hash that is too short', () => {
    const data = { ...validBase, replication_hash: 'abc' }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('replication_hash')
    }
  })

  // Test 5: replication_hash with uppercase chars fails
  it('rejects replication_hash containing uppercase characters', () => {
    const upperHash = VALID_HASH.toUpperCase()
    const data = { ...validBase, replication_hash: upperHash }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('replication_hash')
    }
  })

  // Test 6: slug with uppercase + underscore fails
  it('rejects slug with uppercase letters or underscores', () => {
    const data = { ...validBase, slug: 'Pair_D' }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('slug')
    }
  })

  // Test 7: p_value > 1 fails
  it('rejects p_value greater than 1', () => {
    const data = { ...validBase, p_value: 1.5 }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('p_value')
    }
  })

  // Test 8: valid 64-char sha256 hex passes
  it('accepts a valid 64-char lowercase sha256 hex for replication_hash', () => {
    const result = iterationSchema.safeParse({
      ...validBase,
      replication_hash: VALID_HASH,
    })
    expect(result.success).toBe(true)
  })

  // Test 9: status field only accepts the four known enum values
  it('rejects unknown status values like CLOSED', () => {
    const data = { ...validBase, status: 'CLOSED' }
    const result = iterationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('status')
    }
  })

  it('accepts all four valid status enum values', () => {
    for (const status of ['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS'] as const) {
      const data =
        status === 'FAIL'
          ? { ...validBase, status, disposition_memo: 'Required for FAIL.' }
          : { ...validBase, status }
      const result = iterationSchema.safeParse(data)
      expect(result.success, `status=${status} should be valid`).toBe(true)
    }
  })
})
