// @vitest-environment node
// Phase 2 Wave 0 — research collection schema tests
// Mirrors the pattern from tests/unit/velite-schema.test.ts (iteration schema).
// Uses safeParse directly on researchSchema — no Velite build pipeline invoked.
import { describe, expect, it } from 'vitest'
import { researchSchema } from '../../velite.config'

const validBase = {
  slug: 'pair-d-dispatch-brief',
  title_es: 'Diseño de etapa 2: despacho M-sketch para par D',
  title_en: 'Stage 2 design: M-sketch dispatch for Pair D',
  authors: ['wvs-finance/abrigo-analytics'],
  date: '2026-04-30',
  type: 'decision-memo' as const,
  summary_es:
    'Memo de diseño pre-comprometido para la etapa 2 del par D (Y=COP/USD, M=spread de swaps, X=par D).',
  summary_en: 'Pre-committed design memo for Pair D stage 2 (Y=COP/USD, M=swap spread, X=pair D).',
}

describe('velite research schema', () => {
  // Test 1: valid entry with all required fields and omitted optional external_url
  it('accepts a valid entry with all required fields and no external_url', () => {
    const result = researchSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  // Test 2: rejects entry missing title_es
  it('rejects entry missing title_es', () => {
    const { title_es: _removed, ...data } = validBase
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('title_es')
    }
  })

  // Test 3: rejects entry missing title_en
  it('rejects entry missing title_en', () => {
    const { title_en: _removed, ...data } = validBase
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('title_en')
    }
  })

  // Test 4: rejects entry missing summary_es
  it('rejects entry missing summary_es', () => {
    const { summary_es: _removed, ...data } = validBase
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('summary_es')
    }
  })

  // Test 4b: rejects entry missing summary_en
  it('rejects entry missing summary_en', () => {
    const { summary_en: _removed, ...data } = validBase
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('summary_en')
    }
  })

  // Test 5: rejects entry with type outside the enum
  it('rejects entry with type outside allowed enum', () => {
    const data = { ...validBase, type: 'blog-post' }
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('type')
    }
  })

  // Test 6: rejects entry where authors is empty array
  it('rejects entry where authors is empty array', () => {
    const data = { ...validBase, authors: [] }
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('authors')
    }
  })

  // Test 7: accepts entry with optional order (positive int) + external_url (URL)
  it('accepts entry with optional order and external_url', () => {
    const data = {
      ...validBase,
      order: 1,
      external_url: 'https://arxiv.org/abs/2026.12345',
    }
    const result = researchSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  // Additional: accepts all four type enum values
  it('accepts all four valid type enum values', () => {
    for (const type of ['paper', 'decision-memo', 'write-up', 'talk'] as const) {
      const data = { ...validBase, type }
      const result = researchSchema.safeParse(data)
      expect(result.success, `type=${type} should be valid`).toBe(true)
    }
  })
})
