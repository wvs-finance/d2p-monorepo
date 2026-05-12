// @vitest-environment node
// Unit tests for lib/team/contributors.ts
// Covers requirement: LAB-02

import { describe, expect, it } from 'vitest'
import { contributors } from '../../lib/team/contributors'

describe('lib/team/contributors', () => {
  // Test 1: array is typed and non-empty
  it('contributors array is typed and length ≥ 1', () => {
    expect(Array.isArray(contributors)).toBe(true)
    expect(contributors.length).toBeGreaterThanOrEqual(1)
  })

  // Test 2: every entry has required fields
  it('every entry has required fields: slug, name, role_es, role_en, github_handle', () => {
    for (const c of contributors) {
      expect(c.slug, `slug missing on ${c.name ?? 'unknown'}`).toBeTruthy()
      expect(c.name, `name missing on entry ${c.slug}`).toBeTruthy()
      expect(c.role_es, `role_es missing on ${c.slug}`).toBeTruthy()
      expect(c.role_en, `role_en missing on ${c.slug}`).toBeTruthy()
      expect(c.github_handle, `github_handle missing on ${c.slug}`).toBeTruthy()
    }
  })

  // Test 3: every github_handle is a valid GitHub username
  it('every github_handle matches /^[a-zA-Z0-9-]+$/ (valid GitHub username pattern)', () => {
    const pattern = /^[a-zA-Z0-9-]+$/
    for (const c of contributors) {
      expect(
        pattern.test(c.github_handle),
        `github_handle "${c.github_handle}" on ${c.slug} is not a valid GitHub username`,
      ).toBe(true)
    }
  })

  // Test 4: slug values are unique
  it('slug values are unique across all contributors', () => {
    const slugs = contributors.map((c) => c.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(slugs.length)
  })
})
