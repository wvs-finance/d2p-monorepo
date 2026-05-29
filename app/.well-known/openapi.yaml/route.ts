import { generateOpenApiYaml } from '@/lib/openapi/generate'

export const dynamic = 'force-static'

// Generated once at build from the canonical Zod registry (lib/openapi). The schemas are
// shared with the live routes (proven equal by tests/api/openapi-conformance.test.ts), so
// this spec cannot drift from actual response shapes.
const body = generateOpenApiYaml()

export function GET() {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/yaml; charset=utf-8' },
  })
}
