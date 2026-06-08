// @vitest-environment node
// Wave 0 scaffold — the index.ts re-export assertion is un-fixme'd by Plan 05.
//
// AGENT-01 / B3 no-duplication + M6 single-extend architecture guards. Static-grep over
// repo sources (filename .test.ts so Vitest collects it, Playwright excludes it).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it, test } from 'vitest'

const REPO = resolve(__dirname, '../..')
const MCP_TOOLS_DIR = join(REPO, 'lib/mcp-tools')
const LIB_DIR = join(REPO, 'lib')

function walk(dir: string): string[] {
  const out: string[] = []
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) out.push(...walk(p))
      else if (/\.ts$/.test(p)) out.push(p)
    }
  } catch {
    // dir absent yet — vacuous pass
  }
  return out
}

describe('mcp-tools no-duplication + single-extend architecture', () => {
  it('no lib/mcp-tools/*.ts handler does an internal fetch at /api/ (direct lib import, AGENT-01)', () => {
    for (const file of walk(MCP_TOOLS_DIR)) {
      const src = readFileSync(file, 'utf8')
      // tolerate zero tool files today; assert none introduces an internal BFF hop
      expect(/await\s+fetch\(\s*['"`][^'"`]*\/api\//.test(src)).toBe(false)
    }
  })

  it('extendZodWithOpenApi( appears in exactly ONE file: lib/dashboard/contract.ts (M6)', () => {
    const matches = walk(LIB_DIR).filter((f) =>
      readFileSync(f, 'utf8').includes('extendZodWithOpenApi('),
    )
    expect(matches).toHaveLength(1)
    expect(matches[0]?.endsWith('lib/dashboard/contract.ts')).toBe(true)
  })

  it('lib/openapi/schemas.ts (when it exists) does NOT call extendZodWithOpenApi (M6)', () => {
    const schemas = join(LIB_DIR, 'openapi/schemas.ts')
    if (!existsSync(schemas)) return // Plan 04 has not created it yet — skip
    expect(readFileSync(schemas, 'utf8').includes('extendZodWithOpenApi(')).toBe(false)
  })

  it('lib/mcp-tools/contract.ts re-exports the canonical schema, never re-declares it (B3)', () => {
    const src = readFileSync(join(MCP_TOOLS_DIR, 'contract.ts'), 'utf8')
    expect(src).toContain("from '@/lib/dashboard/contract'")
    expect(src.includes('const DashboardResponseSchema =')).toBe(false)
  })

  // Plan 05 created the barrel; this assertion is now live.
  test('lib/mcp-tools/index.ts re-exports the six registerXxx functions', async () => {
    // Plan 05 creates the barrel. Indirected path so tsc does not statically resolve it.
    const BARREL_MODULE = '@/lib/mcp-tools/index'
    const barrel = (await import(BARREL_MODULE)) as Record<string, unknown>
    for (const fn of [
      'registerListApps',
      'registerListIterations',
      'registerGetIterationState',
      'registerGetInstrumentTerms',
      'registerGetPoolState',
      'registerQueryEconometricPanel',
    ]) {
      expect(typeof barrel[fn]).toBe('function')
    }
  })
})
