// Drift-proof OpenAPI 3.1 document generated from the canonical Zod registry (AGENT-08).
// OpenApiGeneratorV31 builds the document from registry.definitions; js-yaml's `dump`
// serializes it (no hand-rolled string concatenation — 04-RESEARCH "Don't Hand-Roll").
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import yaml from 'js-yaml'
import { registry } from './schemas'

export function generateOpenApiYaml(): string {
  const doc = new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'd2p Finance Public API',
      version: '0.1.0',
      description:
        'Public REST surface for d2p Finance / DS2P Labs. Schemas are generated from the same Zod definitions the routes conform to, so the spec cannot drift from live responses.',
    },
    servers: [{ url: 'https://www.d2pfinance.xyz', description: 'Production' }],
  })
  return yaml.dump(doc)
}
