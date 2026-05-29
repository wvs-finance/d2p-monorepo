// Phase 2 Wave 0 — i18n namespace parity tests
// Verifies symmetric key coverage between es-CO and en for all 4 Phase 2 namespaces.
// Covers requirement: LAB-06
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type NestedRecord = { [key: string]: string | NestedRecord }

function loadJson(filePath: string): NestedRecord {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as NestedRecord
}

// Collect all dot-notation key paths from a nested object
function collectKeyPaths(obj: NestedRecord, prefix = ''): string[] {
  const paths: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      paths.push(...collectKeyPaths(value as NestedRecord, fullKey))
    } else {
      paths.push(fullKey)
    }
  }
  return paths
}

function assertKeyParity(nsName: string, esCoPath: string, enPath: string) {
  const esCo = loadJson(esCoPath)
  const en = loadJson(enPath)

  const esCoKeys = new Set(collectKeyPaths(esCo))
  const enKeys = new Set(collectKeyPaths(en))

  const inEsCoOnlyPaths = [...esCoKeys].filter((k) => !enKeys.has(k))
  const inEnOnlyPaths = [...enKeys].filter((k) => !esCoKeys.has(k))

  expect(
    inEsCoOnlyPaths,
    `${nsName}: keys in es-CO but not en: ${inEsCoOnlyPaths.join(', ')}`,
  ).toHaveLength(0)

  expect(
    inEnOnlyPaths,
    `${nsName}: keys in en but not es-CO: ${inEnOnlyPaths.join(', ')}`,
  ).toHaveLength(0)
}

const messagesDir = resolve(__dirname, '../../messages')

describe('i18n namespace key parity (es-CO ↔ en)', () => {
  // research namespace parity
  it('research namespace has identical key paths in es-CO and en', () => {
    assertKeyParity(
      'research',
      resolve(messagesDir, 'es-CO/research.json'),
      resolve(messagesDir, 'en/research.json'),
    )
  })

  // team namespace parity
  it('team namespace has identical key paths in es-CO and en', () => {
    assertKeyParity(
      'team',
      resolve(messagesDir, 'es-CO/team.json'),
      resolve(messagesDir, 'en/team.json'),
    )
  })

  // about namespace parity
  it('about namespace has identical key paths in es-CO and en', () => {
    assertKeyParity(
      'about',
      resolve(messagesDir, 'es-CO/about.json'),
      resolve(messagesDir, 'en/about.json'),
    )
  })

  // dashboard namespace parity (includes nested status.* keys — recursive check required)
  it('dashboard namespace has identical key paths in es-CO and en', () => {
    assertKeyParity(
      'dashboard',
      resolve(messagesDir, 'es-CO/dashboard.json'),
      resolve(messagesDir, 'en/dashboard.json'),
    )
  })
})
