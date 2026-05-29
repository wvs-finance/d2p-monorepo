// @vitest-environment node
// Wave 0 scaffold — skipped assertions are un-skipped by Plan 04 (lib/openapi/generate.ts).
// vitest has no test.fixme; .skip is the red-pending equivalent that keeps the suite green.

import { describe, expect, test } from 'vitest'

// Indirected so tsc does not statically resolve the not-yet-created module (Plan 04 ships it).
const GENERATE_MODULE = '@/lib/openapi/generate'

describe('OpenAPI 3.1 generation', () => {
  test.skip('openapi.yaml contains openapi: 3.1.0 and all four endpoint paths', async () => {
    const { generateOpenApiYaml } = (await import(GENERATE_MODULE)) as {
      generateOpenApiYaml: () => string
    }
    const yaml = generateOpenApiYaml()
    expect(yaml).toContain('openapi: 3.1.0')
    expect(yaml).toContain('/api/dashboard')
    expect(yaml).toContain('/api/status')
    expect(yaml).toContain('/api/health')
    expect(yaml).toContain('/api/mcp')
  })
})
