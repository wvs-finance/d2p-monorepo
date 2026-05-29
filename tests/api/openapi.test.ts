// @vitest-environment node
// OpenAPI 3.1 generation — asserts the generated spec covers all four endpoints with the
// correct health runtime example and round-trips through a YAML parser (Plan 04).

import yaml from 'js-yaml'
import { describe, expect, test } from 'vitest'

import { generateOpenApiYaml } from '@/lib/openapi/generate'

describe('OpenAPI 3.1 generation', () => {
  test('openapi.yaml contains openapi: 3.1.0 and all four endpoint paths', () => {
    const out = generateOpenApiYaml()
    expect(out).toContain('openapi: 3.1.0')
    expect(out).toContain('/api/dashboard')
    expect(out).toContain('/api/status')
    expect(out).toContain('/api/health')
    expect(out).toContain('/api/mcp')
  })

  test('the /api/health example uses runtime: node (M5), not nodejs', () => {
    const out = generateOpenApiYaml()
    expect(out).toContain('runtime: node')
    expect(out).not.toContain('runtime: nodejs')
  })

  test('the generated document parses back as valid YAML', () => {
    const out = generateOpenApiYaml()
    expect(() => yaml.load(out)).not.toThrow()
    const parsed = yaml.load(out) as { openapi?: string }
    expect(parsed.openapi).toBe('3.1.0')
  })
})
