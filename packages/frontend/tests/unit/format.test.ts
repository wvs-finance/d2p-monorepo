import { describe, expect, it } from 'vitest'

describe('lib/format/currency', () => {
  it('formats COP for es-CO by default', async () => {
    const { formatCurrency } = await import('../../lib/format/currency')
    const result = formatCurrency(1234.5, 'es-CO')
    // COP formatted: uses "." thousands separator, "," decimal — and COP or $ indicator
    // Note: ICU formats COP as "$ 1.234,5" (no trailing zero) by default
    expect(result).toMatch(/1\.234/)
    expect(result).toMatch(/,5/)
    expect(result).toMatch(/\$/)
  })

  it('formats USD for en by default', async () => {
    const { formatCurrency } = await import('../../lib/format/currency')
    const result = formatCurrency(1234.5, 'en')
    // USD formatted: starts with $ and uses comma thousands
    expect(result).toMatch(/\$1,234\.50/)
  })

  it('honors currency override: USD in es-CO locale', async () => {
    const { formatCurrency } = await import('../../lib/format/currency')
    const result = formatCurrency(1234.5, 'es-CO', { currency: 'USD' })
    // Override to USD even though locale is es-CO
    expect(result).toMatch(/USD|US\$|\$/)
    expect(result).toMatch(/1\.234,50/)
  })
})

describe('lib/format/date', () => {
  it('formats 2026-05-11 as "11 de mayo de 2026" for es-CO', async () => {
    const { formatDate } = await import('../../lib/format/date')
    const d = new Date('2026-05-11T12:00:00Z')
    expect(formatDate(d, 'es-CO')).toMatch(/11 de mayo de 2026/)
  })

  it('formats 2026-05-11 as "May 11, 2026" for en', async () => {
    const { formatDate } = await import('../../lib/format/date')
    const d = new Date('2026-05-11T12:00:00Z')
    expect(formatDate(d, 'en')).toBe('May 11, 2026')
  })

  it('accepts a date string as input', async () => {
    const { formatDate } = await import('../../lib/format/date')
    expect(formatDate('2026-05-11T12:00:00Z', 'en')).toBe('May 11, 2026')
  })

  it('formatDateTime returns date + time for es-CO', async () => {
    const { formatDateTime } = await import('../../lib/format/date')
    const d = new Date('2026-05-11T12:00:00Z')
    const result = formatDateTime(d, 'es-CO')
    expect(result).toMatch(/mayo/)
    expect(result).toMatch(/\d{2}/)
  })

  it('formatRelative returns relative string for es-CO', async () => {
    const { formatRelative } = await import('../../lib/format/date')
    const result = formatRelative(new Date(), 'es-CO')
    // "hoy" or "ayer" depending on exact timing
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('never references en-US hardcoded locale (source grep)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    // Use process.cwd() which is the project root during vitest runs
    const source = readFileSync(resolve(process.cwd(), 'lib/format/date.ts'), 'utf-8')
    expect(source).not.toContain('en-US')
    expect(source).not.toContain('toLocaleString')
    expect(source).not.toContain('toLocaleDateString')
    expect(source).not.toContain('toLocaleTimeString')
  })
})

describe('lib/format/number', () => {
  it('uses "." thousands and "," decimal for es-CO', async () => {
    const { formatNumber } = await import('../../lib/format/number')
    const result = formatNumber(1234567.89, 'es-CO')
    expect(result).toBe('1.234.567,89')
  })

  it('uses "," thousands and "." decimal for en', async () => {
    const { formatNumber } = await import('../../lib/format/number')
    const result = formatNumber(1234567.89, 'en')
    expect(result).toBe('1,234,567.89')
  })

  it('formatPercent returns percent string for es-CO', async () => {
    const { formatPercent } = await import('../../lib/format/number')
    const result = formatPercent(0.1234, 'es-CO')
    expect(result).toMatch(/%/)
    expect(result).toMatch(/12/)
  })

  it('formatPercent returns percent string for en', async () => {
    const { formatPercent } = await import('../../lib/format/number')
    const result = formatPercent(0.1234, 'en')
    expect(result).toMatch(/%/)
    expect(result).toMatch(/12/)
  })
})

describe('Intl primitives sanity (proves test infra)', () => {
  it('formats es-CO date as "11 de mayo de 2026"', () => {
    const d = new Date('2026-05-11T12:00:00Z')
    const f = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
    expect(f.format(d)).toMatch(/11 de mayo de 2026/)
  })
  it('formats en date as "May 11, 2026"', () => {
    const d = new Date('2026-05-11T12:00:00Z')
    const f = new Intl.DateTimeFormat('en', { dateStyle: 'long' })
    expect(f.format(d)).toBe('May 11, 2026')
  })
})
